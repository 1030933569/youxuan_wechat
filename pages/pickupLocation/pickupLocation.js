const api = require('../../utils/api');
const storage = require('../../utils/storage');
const { definePage } = require('../../utils/mp-guard');

definePage({
  data: {
    list: [],
    currentLeaderId: null,
    page: 1,
    limit: 10,
    hasMore: true,
    loading: false
  },

  onLoad() {
    const current = storage.getPickupLocation();
    this.setData({ currentLeaderId: current && current.id ? current.id : current && current.leaderId ? current.leaderId : null });
    this.resetAndLoad();
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
        limit: this.data.limit
      });
      const content = (result && result.content) || [];
      const list = reset ? content : this.data.list.concat(content);
      const totalPages = result && typeof result.totalPages === 'number' ? result.totalPages : 0;
      const hasMore = totalPages > 0 ? page < totalPages : content.length >= this.data.limit;
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
      // 线上后端未开放 selectLeader 接口时，本地存储兜底，保证毕设可跑通
      storage.setPickupLocation({ ...loc, leaderId: loc.id });
      this.setData({ currentLeaderId: loc.id });
      wx.showToast({ title: '已设置提货点', icon: 'none' });
      wx.navigateBack();
    } catch (err) {
      console.error(err);
    }
  }
});

