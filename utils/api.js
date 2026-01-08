const { request } = require('./http');

function cleanParams(params) {
  const data = {};
  if (!params) return data;
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null) data[key] = value;
  });
  return data;
}

module.exports = {
  getWxLogin({ code }) {
    return request({ url: `/user/weixin/wxLogin/${code}`, showLoading: false });
  },

  getHomeIndex() {
    return request({ url: 'home/index' });
  },

  getSearchSku(params = {}) {
    const { page = 1, limit = 10, ...rest } = params;
    return request({
      url: `/search/sku/${page}/${limit}`,
      data: cleanParams({ ...rest, limit })
    });
  },

  getHomeItem({ skuId }) {
    return request({ url: `/home/item/${skuId}` });
  },

  getAddToCart({ skuId, skuNum }) {
    return request({ url: `/cart/addToCart/${skuId}/${skuNum}`, showLoading: false });
  },

  getCartList() {
    return request({ url: '/cart/cartList' });
  },

  getCheckCart({ skuId, isChecked }) {
    return request({ url: `/cart/checkCart/${skuId}/${isChecked}`, showLoading: false });
  },

  deleteCart({ skuId }) {
    return request({ url: `/cart/deleteCart/${skuId}`, method: 'DELETE', showLoading: false });
  },

  getConfirmOrder() {
    return request({ url: '/order/auth/confirmOrder' });
  },

  postSubmitOrder(data) {
    return request({ url: '/order/auth/submitOrder', method: 'POST', data });
  },

  getFindUserOrder(params = {}) {
    const { page = 1, limit = 10, ...rest } = params;
    return request({
      url: `/order/auth/findUserOrderPage/${page}/${limit}`,
      data: cleanParams(rest),
      showLoading: false
    });
  },

  getSearchLeader(params = {}) {
    const { page = 1, limit = 10, ...rest } = params;
    return request({
      url: `/search/leader/${page}/${limit}`,
      data: cleanParams(rest),
      showLoading: false
    });
  },

  getSelectLeader({ leaderId }) {
    return request({ url: `/user/leader/auth/selectLeader/${leaderId}`, showLoading: false });
  }
};

