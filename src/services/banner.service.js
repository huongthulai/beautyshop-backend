const mongoose = require("mongoose");
const Banner = require("../models/Banner");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const validateBannerTimeRange = (startAt, endAt) => {
  if (startAt && endAt) {
    const start = new Date(startAt);
    const end = new Date(endAt);

    if (start.getTime() > end.getTime()) {
      throw new Error("endAt phải lớn hơn hoặc bằng startAt");
    }
  }
};

const normalizeOrder = (value, fallback = 0) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
};

const normalizePayload = (payload = {}) => {
  return {
    title: payload.title?.trim(),
    subtitle: payload.subtitle?.trim() || "",
    image: payload.image?.trim(),
    mobileImage: payload.mobileImage?.trim() || "",
    link: payload.link?.trim() || "",
    buttonText: payload.buttonText?.trim() || "",
    order: normalizeOrder(payload.order, 0),
    isActive:
      typeof payload.isActive === "boolean" ? payload.isActive : true,
    startAt: payload.startAt || null,
    endAt: payload.endAt || null,
  };
};

const getActiveBannersSorted = async (excludeId = null) => {
  const filter = { isActive: true };
  if (excludeId && isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  return Banner.find(filter).sort({ order: 1, createdAt: -1 });
};

const getInactiveBannersSorted = async (excludeId = null) => {
  const filter = { isActive: false };
  if (excludeId && isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  return Banner.find(filter).sort({ order: 1, createdAt: -1 });
};

const reindexActiveBanners = async (excludeId = null) => {
  const activeBanners = await getActiveBannersSorted(excludeId);

  for (let i = 0; i < activeBanners.length; i += 1) {
    if (activeBanners[i].order !== i) {
      activeBanners[i].order = i;
      await activeBanners[i].save();
    }
  }

  return activeBanners;
};

const findActiveBannerByOrder = async (order, excludeId = null) => {
  const filter = {
    isActive: true,
    order,
  };

  if (excludeId && isValidObjectId(excludeId)) {
    filter._id = { $ne: excludeId };
  }

  return Banner.findOne(filter).sort({ createdAt: 1 });
};

const moveActiveBannerToLastOrder = async (bannerId, extraOffset = 0) => {
  const banner = await Banner.findById(bannerId);
  if (!banner) return null;

  const activeBanners = await getActiveBannersSorted(bannerId);
  banner.order = activeBanners.length + Math.max(Number(extraOffset) || 0, 0);
  await banner.save();

  return banner;
};

const resolveActiveOrderConflict = async ({
  requestedOrder,
  excludeId = null,
  forceReplace = false,
  extraLastOffset = 0,
}) => {
  const conflictBanner = await findActiveBannerByOrder(requestedOrder, excludeId);

  if (!conflictBanner) {
    return { hasConflict: false, replacedBanner: null };
  }

  if (!forceReplace) {
    throw new Error("ORDER_CONFLICT");
  }

  await moveActiveBannerToLastOrder(conflictBanner._id, extraLastOffset);

  return {
    hasConflict: true,
    replacedBanner: conflictBanner,
  };
};

const hideBannerAndCollapseActiveOrders = async (banner) => {
  const activeBanners = await getActiveBannersSorted(banner._id);
  const inactiveBanners = await getInactiveBannersSorted(banner._id);

  for (let i = 0; i < activeBanners.length; i += 1) {
    if (activeBanners[i].order !== i) {
      activeBanners[i].order = i;
      await activeBanners[i].save();
    }
  }

  const maxInactiveOrder =
    inactiveBanners.length > 0
      ? Math.max(...inactiveBanners.map((item) => Number(item.order) || 0))
      : -1;

  banner.isActive = false;
  banner.order = maxInactiveOrder + 1;
  await banner.save();

  return banner;
};

const showBannerAsLastActive = async (banner) => {
  const activeBanners = await getActiveBannersSorted();

  banner.isActive = true;
  banner.order = activeBanners.length;
  await banner.save();

  return banner;
};

const getBanners = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.max(Number(query.limit) || 20, 1);
  const skip = (page - 1) * limit;

  const filter = {};

  if (query.isActive !== undefined && query.isActive !== "") {
    filter.isActive = query.isActive === "true";
  }

  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { subtitle: { $regex: keyword, $options: "i" } },
      { buttonText: { $regex: keyword, $options: "i" } },
      { link: { $regex: keyword, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Banner.find(filter)
      .sort({ isActive: -1, order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Banner.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const createBanner = async (payload) => {
  const normalized = normalizePayload(payload);

  if (!normalized.title) {
    throw new Error("Tiêu đề banner là bắt buộc");
  }

  if (!normalized.image) {
    throw new Error("Ảnh banner là bắt buộc");
  }

  validateBannerTimeRange(normalized.startAt, normalized.endAt);

  if (normalized.isActive) {
    await reindexActiveBanners();

    const activeBanners = await getActiveBannersSorted();
    const defaultOrder = activeBanners.length;

    const hasCustomOrder =
      payload.order !== undefined &&
      payload.order !== null &&
      String(payload.order).trim() !== "";

    const requestedOrder = hasCustomOrder
      ? normalizeOrder(payload.order, defaultOrder)
      : defaultOrder;

    await resolveActiveOrderConflict({
  requestedOrder,
  forceReplace: Boolean(payload.forceReplaceOrder),
  extraLastOffset: Boolean(payload.forceReplaceOrder) ? 1 : 0,
});

    return Banner.create({
      ...normalized,
      order: requestedOrder,
      isActive: true,
    });
  }

  const inactiveBanners = await getInactiveBannersSorted();
  const maxInactiveOrder =
    inactiveBanners.length > 0
      ? Math.max(...inactiveBanners.map((item) => Number(item.order) || 0))
      : -1;

  return Banner.create({
    ...normalized,
    isActive: false,
    order: maxInactiveOrder + 1,
  });
};

const updateBanner = async (id, payload) => {
  if (!isValidObjectId(id)) {
    throw new Error("ID banner không hợp lệ");
  }

  const banner = await Banner.findById(id);
  if (!banner) {
    throw new Error("Không tìm thấy banner");
  }

  const previousIsActive = banner.isActive;

  if (payload.title !== undefined) {
    banner.title = payload.title?.trim();
    if (!banner.title) throw new Error("Tiêu đề banner là bắt buộc");
  }

  if (payload.subtitle !== undefined) {
    banner.subtitle = payload.subtitle?.trim() || "";
  }

  if (payload.image !== undefined) {
    banner.image = payload.image?.trim();
    if (!banner.image) throw new Error("Ảnh banner là bắt buộc");
  }

  if (payload.mobileImage !== undefined) {
    banner.mobileImage = payload.mobileImage?.trim() || "";
  }

  if (payload.link !== undefined) {
    banner.link = payload.link?.trim() || "";
  }

  if (payload.buttonText !== undefined) {
    banner.buttonText = payload.buttonText?.trim() || "";
  }

  if (payload.startAt !== undefined) {
    banner.startAt = payload.startAt || null;
  }

  if (payload.endAt !== undefined) {
    banner.endAt = payload.endAt || null;
  }

  validateBannerTimeRange(banner.startAt, banner.endAt);

  const nextIsActive =
    payload.isActive !== undefined ? Boolean(payload.isActive) : banner.isActive;

    const isReorderOnlyRequest =
  payload.reorderMode === true &&
  payload.order !== undefined &&
  payload.title === undefined &&
  payload.subtitle === undefined &&
  payload.image === undefined &&
  payload.mobileImage === undefined &&
  payload.link === undefined &&
  payload.buttonText === undefined &&
  payload.startAt === undefined &&
  payload.endAt === undefined &&
  payload.isActive === undefined;

if (banner.isActive && nextIsActive && isReorderOnlyRequest) {
  banner.order = normalizeOrder(payload.order, banner.order);
  await banner.save();
  return banner;
}

  if (previousIsActive && !nextIsActive) {
    await hideBannerAndCollapseActiveOrders(banner);
    return banner;
  }

  if (!previousIsActive && nextIsActive) {
    await showBannerAsLastActive(banner);
  }

  banner.isActive = nextIsActive;

  if (banner.isActive && payload.order !== undefined) {
    await reindexActiveBanners(id);

    const requestedOrder = normalizeOrder(payload.order, banner.order);

    if (requestedOrder !== banner.order) {
      await resolveActiveOrderConflict({
        requestedOrder,
        excludeId: id,
        forceReplace: Boolean(payload.forceReplaceOrder),
      });
    }

    banner.order = requestedOrder;
  }

  await banner.save();

  if (banner.isActive) {
    await reindexActiveBanners();
  }

  return banner;
};

const deleteBanner = async (id) => {
  if (!isValidObjectId(id)) {
    throw new Error("ID banner không hợp lệ");
  }

  const banner = await Banner.findById(id);
  if (!banner) {
    throw new Error("Không tìm thấy banner");
  }

  const wasActive = banner.isActive;

  await banner.deleteOne();

  if (wasActive) {
    await reindexActiveBanners();
  }

  return { deleted: true };
};

const getActiveBanners = async () => {
  const now = new Date();

  const items = await Banner.find({
    isActive: true,
    $and: [
      {
        $or: [{ startAt: null }, { startAt: { $lte: now } }],
      },
      {
        $or: [{ endAt: null }, { endAt: { $gte: now } }],
      },
    ],
  }).sort({ order: 1, createdAt: -1 });

  return items;
};

module.exports = {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  getActiveBanners,
};