const storage = require('./storage');

const BASE_URL = 'https://ssysmono.zeabur.app/api';

function buildUrl(url) {
  if (/^https?:\/\//i.test(url)) return url;
  const base = BASE_URL.replace(/\/+$/, '');
  const path = String(url || '').replace(/^\/+/, '');
  return `${base}/${path}`;
}

function request(options) {
  const { url, method = 'GET', data = {}, header = {}, showLoading = true, loadingText = '加载中...' } = options || {};
  if (!url) return Promise.reject(new Error('request: url is required'));

  const token = storage.getToken();
  const userId = storage.getUserId();

  const finalHeader = {
    'content-type': 'application/json',
    ...header
  };
  if (token) finalHeader.token = token;
  if (!finalHeader.userId) finalHeader.userId = userId || '1';

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(url),
      method,
      data,
      header: finalHeader,
      success(res) {
        const body = res.data;
        if (body && typeof body === 'object') {
          if (body.code === 200) return resolve(body.data);
          if (body.code === 208) {
            storage.clearToken();
            wx.reLaunch({ url: '/pages/login/login' });
            return reject(body);
          }
          wx.showToast({ title: body.message || '请求失败', icon: 'none' });
          return reject(body);
        }

        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(body);
        wx.showToast({ title: '请求失败', icon: 'none' });
        reject(res);
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
      complete() {
        if (showLoading) wx.hideLoading();
      }
    });
  });
}

module.exports = {
  BASE_URL,
  request
};

