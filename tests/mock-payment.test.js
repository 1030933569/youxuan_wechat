const test = require('node:test');
const assert = require('node:assert/strict');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // ignore
  }
}

test('api.postMockPay sends backend payment request', async () => {
  const requests = [];
  const httpPath = require.resolve('../utils/http');

  require.cache[httpPath] = {
    id: httpPath,
    filename: httpPath,
    loaded: true,
    exports: {
      request(options) {
        requests.push(options);
        return Promise.resolve({ ok: true });
      }
    }
  };

  clearModule('../utils/api');
  const api = require('../utils/api');

  assert.equal(typeof api.postMockPay, 'function');

  await api.postMockPay({ orderNo: 'ORDER-001' });

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0], {
    url: '/payment/weixin/auth/mockPay/ORDER-001',
    method: 'POST',
    showLoading: false
  });

  clearModule('../utils/api');
  clearModule('../utils/http');
});

test('mockPay page confirms payment through backend api', async () => {
  const apiCalls = [];
  const toastCalls = [];
  const switchTabCalls = [];
  let pageOptions = null;

  const apiPath = require.resolve('../utils/api');
  require.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
    exports: {
      postMockPay({ orderNo }) {
        apiCalls.push(orderNo);
        return Promise.resolve({ ok: true });
      }
    }
  };

  global.Page = (options) => {
    pageOptions = options;
    return options;
  };
  global.wx = {
    showToast(options) {
      toastCalls.push(options);
    },
    switchTab(options) {
      switchTabCalls.push(options);
    }
  };
  const originalSetTimeout = global.setTimeout;
  global.setTimeout = (callback) => {
    callback();
    return 0;
  };

  clearModule('../pages/mockPay/mockPay');
  require('../pages/mockPay/mockPay');

  assert.ok(pageOptions);
  assert.equal(typeof pageOptions.onConfirmPay, 'function');

  const pageInstance = {
    data: {
      orderNo: 'ORDER-001',
      paying: false
    },
    setData(patch) {
      this.data = {
        ...this.data,
        ...patch
      };
    }
  };

  await pageOptions.onConfirmPay.call(pageInstance);

  assert.deepEqual(apiCalls, ['ORDER-001']);
  assert.equal(toastCalls[0].title, '支付成功');
  assert.deepEqual(switchTabCalls, [{ url: '/pages/orderList/orderList' }]);

  global.setTimeout = originalSetTimeout;
  delete global.Page;
  delete global.wx;
  clearModule('../pages/mockPay/mockPay');
  clearModule('../utils/api');
});

test('orderList page opens payment page for unpaid order', () => {
  const navigateToCalls = [];
  let pageOptions = null;

  global.Page = (options) => {
    pageOptions = options;
    return options;
  };
  global.wx = {
    navigateTo(options) {
      navigateToCalls.push(options);
    }
  };

  clearModule('../pages/orderList/orderList');
  require('../pages/orderList/orderList');

  assert.ok(pageOptions);
  assert.equal(typeof pageOptions.onPayOrder, 'function');

  pageOptions.onPayOrder({
    currentTarget: {
      dataset: {
        orderId: 101,
        orderNo: 'ORDER-001',
        totalAmount: '88.50',
        receiverName: '张三'
      }
    }
  });

  assert.deepEqual(navigateToCalls, [
    {
      url: '/pages/mockPay/mockPay?orderId=101&orderNo=ORDER-001&totalAmount=88.50&receiverName=%E5%BC%A0%E4%B8%89'
    }
  ]);

  delete global.Page;
  delete global.wx;
  clearModule('../pages/orderList/orderList');
});

test('orderList treats UNPAID status as payable', async () => {
  let pageOptions = null;
  const apiPath = require.resolve('../utils/api');
  const storagePath = require.resolve('../utils/storage');

  require.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
    exports: {
      getFindUserOrder() {
        return Promise.resolve({
          records: [
            {
              id: 1,
              orderNo: 'ORDER-UNPAID',
              orderStatus: 'UNPAID',
              param: {
                orderStatusName: '待支付'
              }
            }
          ],
          pages: 1
        });
      }
    }
  };

  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      getToken() {
        return 'token';
      }
    }
  };

  global.Page = (options) => {
    pageOptions = options;
    return options;
  };

  clearModule('../pages/orderList/orderList');
  require('../pages/orderList/orderList');

  const pageInstance = {
    data: {
      records: [],
      page: 1,
      limit: 10,
      hasMore: true,
      loading: false
    },
    setData(patch) {
      this.data = {
        ...this.data,
        ...patch
      };
    }
  };

  await pageOptions.loadMore.call(pageInstance, true);

  assert.equal(pageInstance.data.records[0].canPay, true);

  delete global.Page;
  clearModule('../pages/orderList/orderList');
  clearModule('../utils/api');
  clearModule('../utils/storage');
});
