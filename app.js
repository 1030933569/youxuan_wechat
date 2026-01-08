const storage = require('./utils/storage');

App({
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

