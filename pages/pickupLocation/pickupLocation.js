const api = require('../../utils/api');
const storage = require('../../utils/storage');

function getLocation() {
  return new Promise((resolve, reject) => {
    wx.getLocation({ type: 'gcj02', success: resolve, fail: reject });
  });
}

Page({
  data: {
    list: [],
    currentLeaderId: null,
    latitude: '',
    longitude: '',
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const current = storage.getPickupLocation();
    this.setData({ currentLeaderId: current && current.id ? current.id : current && current.leaderId ? current.leaderId : null });

    getLocation()
      .then((res) => {
        this.setData({ latitude: res.latitude, longitude: res.longitude });
      })
      .catch(() => {})
      .finally(() => {
        this.resetAndLoad();
      });
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadMore();
  },

  async resetAndLoad() {
    this.setData({ list: [], page: 1, hasMore: true });
    await this.loadMore(true);
  },

  async loadMore(reset = false) {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    this.setData({ loading: true });
    try {
      const page = this.data.page;
      const result = await api.getSearchLeader({
        page,
        limit: this.data.limit,
        latitude: this.data.latitude,
        longitude: this.data.longitude
      });
      const content = (result && result.content) || [];
      const list = reset ? content : this.data.list.concat(content);
      const hasMore = result ? !result.last : false;
      this.setData({ list, hasMore, page: page + 1 });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  },

  async onSelect(e) {
    const idx = e.currentTarget.dataset.index;
    const loc = (this.data.list || [])[idx];
    if (!loc) return;

    try {
      await api.getSelectLeader({ leaderId: loc.id });
      storage.setPickupLocation(loc);
      wx.showToast({ title: '已设置提货点', icon: 'none' });
      wx.navigateBack();
    } catch (err) {
      console.error(err);
    }
  }
});

