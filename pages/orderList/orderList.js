const api = require('../../utils/api');
const storage = require('../../utils/storage');

Page({
  data: {
    records: [],
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onShow() {
    this.resetAndLoad();
  },

  onPullDownRefresh() {
    this.resetAndLoad().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadMore();
  },

  async resetAndLoad() {
    this.setData({ records: [], page: 1, hasMore: true });
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
      const result = await api.getFindUserOrder({ page, limit: this.data.limit });
      const nextRecords = (result && result.records) || [];
      const records = reset ? nextRecords : this.data.records.concat(nextRecords);
      const pages = Number((result && result.pages) || 0);
      const hasMore = pages > 0 ? page < pages : false;
      this.setData({ records, hasMore, page: page + 1 });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ loading: false });
    }
  }
});

