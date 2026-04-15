const storage = require('./storage');

const DEFAULT_GROUP_SIZE = 2;
const PRICING_MODE_SINGLE = 'single';
const PRICING_MODE_GROUP2 = 'group2';
const PRICING_MODE_GROUP3 = 'group3';

function toNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value) {
  return (Math.round((toNumber(value) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function normalizeGroupSize(value) {
  const size = Number(value);
  return size === 3 ? 3 : DEFAULT_GROUP_SIZE;
}

function resolvePricingMode(value, groupSize) {
  if (value === PRICING_MODE_SINGLE || value === PRICING_MODE_GROUP2 || value === PRICING_MODE_GROUP3) {
    return value;
  }
  return normalizeGroupSize(groupSize) === 3 ? PRICING_MODE_GROUP3 : PRICING_MODE_GROUP2;
}

function resolveDiscountRate(pricingMode, groupSize) {
  const mode = resolvePricingMode(pricingMode, groupSize);
  if (mode === PRICING_MODE_SINGLE) return 1;
  return mode === PRICING_MODE_GROUP3 ? 0.9 : 0.95;
}

function calculateDisplayPrice(originalPrice, options = {}) {
  return formatAmount(toNumber(originalPrice) * resolveDiscountRate(options.pricingMode, options.groupSize));
}

function resolvePricingLabel(payload = {}) {
  const mode = resolvePricingMode(payload.pricingMode, payload.groupSize);
  if (mode === PRICING_MODE_GROUP3) return '3人团价';
  if (mode === PRICING_MODE_GROUP2) return '2人团价';
  return '单独买';
}

function normalizeJoinedCount(value, groupSize) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(count, groupSize);
}

function normalizeStatus(groupSize, joinedCount, status) {
  if (joinedCount >= groupSize) return 'success';
  return status === 'success' ? 'success' : 'pending';
}

function readOrderGroups() {
  const value = storage.getMockOrderGroups();
  return value && typeof value === 'object' ? value : {};
}

function normalizeDraftGroup(payload = {}) {
  const skuId = Number(payload.skuId);
  const groupSize = normalizeGroupSize(payload.groupSize);
  const pricingMode = resolvePricingMode(payload.pricingMode, groupSize);
  const originalPrice = formatAmount(payload.originalPrice !== undefined ? payload.originalPrice : payload.displayPrice);
  const displayPrice = payload.displayPrice !== undefined
    ? formatAmount(payload.displayPrice)
    : calculateDisplayPrice(originalPrice, { pricingMode, groupSize });

  return {
    skuId: Number.isFinite(skuId) ? skuId : 0,
    groupSize,
    pricingMode,
    originalPrice,
    displayPrice,
    createdAt: Number(payload.createdAt) || Date.now()
  };
}

function normalizeOrderGroup(payload = {}) {
  const groupSize = normalizeGroupSize(payload.groupSize);
  const joinedCount = normalizeJoinedCount(payload.joinedCount, groupSize);
  const createdAt = Number(payload.createdAt) || Date.now();
  const orderNo = String(payload.orderNo || '').trim();
  const pricingMode = resolvePricingMode(payload.pricingMode, groupSize);
  const originalPrice = formatAmount(payload.originalPrice !== undefined ? payload.originalPrice : payload.displayPrice);
  const displayPrice = payload.displayPrice !== undefined
    ? formatAmount(payload.displayPrice)
    : calculateDisplayPrice(payload.originalPrice, { pricingMode, groupSize });

  return {
    orderNo,
    orderId: payload.orderId || '',
    skuId: Number(payload.skuId) || 0,
    groupSize,
    pricingMode,
    joinedCount,
    status: normalizeStatus(groupSize, joinedCount, payload.status),
    originalPrice,
    displayPrice,
    originalTotalAmount: formatAmount(payload.originalTotalAmount !== undefined ? payload.originalTotalAmount : originalPrice),
    displayTotalAmount: payload.displayTotalAmount !== undefined
      ? formatAmount(payload.displayTotalAmount)
      : displayPrice,
    communityName: payload.communityName || '',
    leaderName: payload.leaderName || '',
    createdAt,
    updatedAt: Date.now()
  };
}

function saveDraftGroup(payload = {}) {
  const draft = normalizeDraftGroup(payload);
  storage.setMockGroupDraft(draft);
  return draft;
}

function getDraftGroup() {
  const draft = storage.getMockGroupDraft();
  return draft && typeof draft === 'object' ? normalizeDraftGroup(draft) : null;
}

function consumeDraftGroup() {
  const draft = getDraftGroup();
  storage.clearMockGroupDraft();
  return draft;
}

function saveOrderGroup(payload = {}) {
  const group = normalizeOrderGroup(payload);
  if (!group.orderNo) return null;

  const groups = readOrderGroups();
  groups[group.orderNo] = group;
  storage.setMockOrderGroups(groups);
  return group;
}

function getOrderGroupMap() {
  const groups = readOrderGroups();
  return Object.keys(groups).reduce((result, orderNo) => {
    const group = normalizeOrderGroup(groups[orderNo] || {});
    if (!group.orderNo) return result;
    result[orderNo] = group;
    return result;
  }, {});
}

function markGroupInviteProgress(orderNo) {
  const key = String(orderNo || '').trim();
  if (!key) return null;

  const groups = getOrderGroupMap();
  const current = groups[key];
  if (!current) return null;

  const joinedCount = Math.min(current.joinedCount + 1, current.groupSize);
  const next = normalizeOrderGroup({
    ...current,
    joinedCount
  });

  groups[key] = next;
  storage.setMockOrderGroups(groups);
  return next;
}

module.exports = {
  DEFAULT_GROUP_SIZE,
  PRICING_MODE_SINGLE,
  PRICING_MODE_GROUP2,
  PRICING_MODE_GROUP3,
  formatAmount,
  calculateDisplayPrice,
  resolvePricingMode,
  resolvePricingLabel,
  saveDraftGroup,
  getDraftGroup,
  consumeDraftGroup,
  saveOrderGroup,
  getOrderGroupMap,
  markGroupInviteProgress
};
