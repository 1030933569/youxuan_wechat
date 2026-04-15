const DALIAN_PICKUP_NAME = '大连市高新区凌水社区提货点';
const DALIAN_PICKUP_ADDRESS = '大连市高新区软件园路1号';
const DALIAN_COMMUNITY_NAME = '大连市高新区凌水社区';

function isDalianText(value) {
  return typeof value === 'string' && value.includes('大连');
}

function normalizePickupLocation(location = {}) {
  return {
    ...location,
    takeName: isDalianText(location.takeName) ? location.takeName : DALIAN_PICKUP_NAME,
    detailAddress: isDalianText(location.detailAddress) ? location.detailAddress : DALIAN_PICKUP_ADDRESS
  };
}

function normalizePickupList(list = []) {
  return (Array.isArray(list) ? list : []).map((item) => normalizePickupLocation(item));
}

function normalizeCommunityName(value) {
  return isDalianText(value) ? value : DALIAN_COMMUNITY_NAME;
}

module.exports = {
  DALIAN_PICKUP_NAME,
  DALIAN_PICKUP_ADDRESS,
  DALIAN_COMMUNITY_NAME,
  normalizePickupLocation,
  normalizePickupList,
  normalizeCommunityName
};
