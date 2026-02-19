const storage = require('./utils/storage');
const { defineApp } = require('./utils/mp-guard');

defineApp({
  globalData: {
    token: '',
    userInfo: null,
    pickupLocation: null
  },

  onLaunch() {
    this.globalData.token = storage.getToken() || '';
    this.globalData.userInfo = storage.getUserInfo();
    this.globalData.pickupLocation = storage.getPickupLocation();
  }
});

