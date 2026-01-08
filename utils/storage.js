const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';
const USER_ID_KEY = 'userId';
const PICKUP_LOCATION_KEY = 'pickupLocation';

function safeGet(key) {
  try {
    return wx.getStorageSync(key);
  } catch (e) {
    return undefined;
  }
}

function safeSet(key, value) {
  try {
    wx.setStorageSync(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function safeRemove(key) {
  try {
    wx.removeStorageSync(key);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  TOKEN_KEY,
  USER_INFO_KEY,
  USER_ID_KEY,
  PICKUP_LOCATION_KEY,

  getToken() {
    return safeGet(TOKEN_KEY);
  },
  setToken(token) {
    return safeSet(TOKEN_KEY, token);
  },
  clearToken() {
    safeRemove(TOKEN_KEY);
  },

  getUserInfo() {
    return safeGet(USER_INFO_KEY);
  },
  setUserInfo(userInfo) {
    return safeSet(USER_INFO_KEY, userInfo);
  },

  getUserId() {
    return safeGet(USER_ID_KEY) || '1';
  },
  setUserId(userId) {
    return safeSet(USER_ID_KEY, userId);
  },

  getPickupLocation() {
    return safeGet(PICKUP_LOCATION_KEY);
  },
  setPickupLocation(pickupLocation) {
    return safeSet(PICKUP_LOCATION_KEY, pickupLocation);
  },
  clearPickupLocation() {
    safeRemove(PICKUP_LOCATION_KEY);
  }
};

