const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // ignore
  }
}

test('app config exposes my page in tab bar', () => {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const config = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  assert.ok(config.pages.includes('pages/my/my'));
  assert.ok(config.tabBar.list.some((item) => item.pagePath === 'pages/my/my' && item.text === '我的'));
});

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
        receiverName: '张三',
        pricingLabel: '3人团价'
      }
    }
  });

  assert.deepEqual(navigateToCalls, [
    {
      url: '/pages/mockPay/mockPay?orderId=101&orderNo=ORDER-001&totalAmount=88.50&receiverName=%E5%BC%A0%E4%B8%89&pricingLabel=3%E4%BA%BA%E5%9B%A2%E4%BB%B7'
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

test('mock-group utility stores draft and order group records', () => {
  const storageState = {};
  const storagePath = require.resolve('../utils/storage');

  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      getMockGroupDraft() {
        return storageState.draft;
      },
      setMockGroupDraft(value) {
        storageState.draft = value;
        return true;
      },
      clearMockGroupDraft() {
        delete storageState.draft;
      },
      getMockOrderGroups() {
        return storageState.orderGroups;
      },
      setMockOrderGroups(value) {
        storageState.orderGroups = value;
        return true;
      }
    }
  };

  clearModule('../utils/mock-group');
  const mockGroup = require('../utils/mock-group');

  const draft = mockGroup.saveDraftGroup({
    skuId: 201,
    groupSize: 3,
    pricingMode: 'group3',
    originalPrice: '100.00',
    displayPrice: '90.00'
  });
  assert.equal(draft.groupSize, 3);
  assert.equal(draft.pricingMode, 'group3');
  assert.equal(draft.originalPrice, '100.00');
  assert.equal(draft.displayPrice, '90.00');

  const consumed = mockGroup.consumeDraftGroup();
  assert.equal(consumed.skuId, 201);
  assert.equal(storageState.draft, undefined);

  mockGroup.saveOrderGroup({
    orderNo: 'ORDER-GROUP-001',
    skuId: 201,
    groupSize: 3,
    pricingMode: 'group3',
    joinedCount: 1,
    originalPrice: '100.00',
    displayPrice: '90.00',
    originalTotalAmount: '200.00',
    displayTotalAmount: '180.00',
    communityName: '大连市高新区凌水社区',
    leaderName: '张三'
  });

  const groupMap = mockGroup.getOrderGroupMap();
  assert.equal(groupMap['ORDER-GROUP-001'].status, 'pending');
  assert.equal(groupMap['ORDER-GROUP-001'].pricingMode, 'group3');
  assert.equal(groupMap['ORDER-GROUP-001'].displayPrice, '90.00');
  assert.equal(groupMap['ORDER-GROUP-001'].displayTotalAmount, '180.00');
  assert.equal(groupMap['ORDER-GROUP-001'].communityName, '大连市高新区凌水社区');

  clearModule('../utils/mock-group');
  clearModule('../utils/storage');
});

test('product page template removes dalian tag and shows pricing cards', () => {
  const templatePath = path.join(__dirname, '..', 'pages', 'product', 'product.wxml');
  const content = fs.readFileSync(templatePath, 'utf8');

  assert.equal(content.includes('大连社区'), false);
  assert.equal(content.includes('单独买'), true);
  assert.equal(content.includes('2人团'), true);
  assert.equal(content.includes('3人团'), true);
});

test('product page stores selected group draft before checkout flow', async () => {
  const apiCalls = [];
  const draftCalls = [];
  const switchTabCalls = [];
  let pageOptions = null;

  const apiPath = require.resolve('../utils/api');
  const mockGroupPath = require.resolve('../utils/mock-group');

  require.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
    exports: {
      getAddToCart(payload) {
        apiCalls.push(payload);
        return Promise.resolve({ ok: true });
      }
    }
  };

  require.cache[mockGroupPath] = {
    id: mockGroupPath,
    filename: mockGroupPath,
    loaded: true,
    exports: {
      saveDraftGroup(payload) {
        draftCalls.push(payload);
        return payload;
      }
    }
  };

  global.Page = (options) => {
    pageOptions = options;
    return options;
  };
  global.wx = {
    showToast() {},
    switchTab(options) {
      switchTabCalls.push(options);
    }
  };

  clearModule('../pages/product/product');
  require('../pages/product/product');

  assert.ok(pageOptions);
  assert.equal(typeof pageOptions.onStartGroup, 'function');

  const pageInstance = {
    data: {
      skuId: 301,
      skuInfo: {
        price: 100
      },
      selectedGroupSize: 3
    },
    setData(patch) {
      this.data = {
        ...this.data,
        ...patch
      };
    }
  };

  await pageOptions.onStartGroup.call(pageInstance);

  assert.deepEqual(draftCalls, [{
    skuId: 301,
    groupSize: 3,
    pricingMode: 'group3',
    originalPrice: '100.00',
    displayPrice: '90.00'
  }]);
  assert.deepEqual(apiCalls, [{ skuId: 301, skuNum: 1 }]);
  assert.deepEqual(switchTabCalls, [{ url: '/pages/cart/cart' }]);

  delete global.Page;
  delete global.wx;
  clearModule('../pages/product/product');
  clearModule('../utils/api');
  clearModule('../utils/mock-group');
});

test('orderConfirm uses defaults and saves mock group record after submit', async () => {
  const saveOrderGroupCalls = [];
  const navigateToCalls = [];
  let pageOptions = null;

  const apiPath = require.resolve('../utils/api');
  require.cache[apiPath] = {
    id: apiPath,
    filename: apiPath,
    loaded: true,
      exports: {
        getConfirmOrder() {
          return Promise.resolve({
            orderNo: 'ORDER-GROUP-002',
            totalAmount: 200,
            leaderAddressVo: {
              leaderId: 9,
              takeName: '大连市高新区凌水社区提货点',
            detailAddress: '大连市高新区软件园路1号',
            leaderName: '张三'
          },
          carInfoVoList: [
            {
                cartInfoList: [
                  {
                    skuId: 301,
                    skuName: '海鲜水饺',
                    cartPrice: 100,
                    skuNum: 2,
                    imgUrl: 'img',
                    isChecked: 1
                }
              ]
            }
          ]
        });
      },
      getSelectLeader() {
        return Promise.resolve({
          leaderId: 9,
          takeName: '大连市高新区凌水社区提货点',
          detailAddress: '大连市高新区软件园路1号',
          leaderName: '张三'
        });
      },
      postSubmitOrder() {
        return Promise.resolve(1002);
      }
    }
  };

  const storagePath = require.resolve('../utils/storage');
  require.cache[storagePath] = {
    id: storagePath,
    filename: storagePath,
    loaded: true,
    exports: {
      getToken() {
        return 'token';
      },
      getPickupLocation() {
        return null;
      },
      setPickupLocation() {}
    }
  };

  const mockGroupPath = require.resolve('../utils/mock-group');
    require.cache[mockGroupPath] = {
      id: mockGroupPath,
      filename: mockGroupPath,
      loaded: true,
      exports: {
        getDraftGroup() {
          return {
            skuId: 301,
            groupSize: 3,
            pricingMode: 'group3',
            originalPrice: '100.00',
            displayPrice: '90.00'
          };
        },
        saveOrderGroup(payload) {
          saveOrderGroupCalls.push(payload);
          return payload;
        },
        consumeDraftGroup() {
          return {
            skuId: 301,
            groupSize: 3,
            pricingMode: 'group3',
            originalPrice: '100.00',
            displayPrice: '90.00'
          };
        }
      }
    };

  global.Page = (options) => {
    pageOptions = options;
    return options;
  };
  global.wx = {
    reLaunch() {},
    navigateTo(options) {
      navigateToCalls.push(options);
    },
    showToast() {}
  };

  clearModule('../pages/orderConfirm/orderConfirm');
  require('../pages/orderConfirm/orderConfirm');

  const pageInstance = {
    data: {
      orderNo: '',
      leaderAddressVo: {},
      items: [],
      totalAmount: '0.00',
      originalTotalAmount: '0.00',
      savingsAmount: '0.00',
      receiverName: '',
      receiverPhone: '',
      selectedGroupSize: 2,
      submitting: false
    },
    setData(patch) {
      this.data = {
        ...this.data,
        ...patch
      };
    }
  };

  await pageOptions.loadConfirmOrder.call(pageInstance);

  assert.equal(pageInstance.data.receiverName, '张三');
  assert.equal(pageInstance.data.receiverPhone, '18888888888');
  assert.equal(pageInstance.data.selectedGroupSize, 3);
  assert.equal(pageInstance.data.totalAmount, '180.00');
  assert.equal(pageInstance.data.originalTotalAmount, '200.00');
  assert.equal(pageInstance.data.savingsAmount, '20.00');

  await pageOptions.onSubmit.call(pageInstance);

  assert.equal(saveOrderGroupCalls.length, 1);
  assert.equal(saveOrderGroupCalls[0].orderNo, 'ORDER-GROUP-002');
  assert.equal(saveOrderGroupCalls[0].skuId, 301);
  assert.equal(saveOrderGroupCalls[0].groupSize, 3);
  assert.equal(saveOrderGroupCalls[0].pricingMode, 'group3');
  assert.equal(saveOrderGroupCalls[0].displayPrice, '90.00');
  assert.equal(saveOrderGroupCalls[0].originalTotalAmount, '200.00');
  assert.equal(saveOrderGroupCalls[0].displayTotalAmount, '180.00');
  assert.equal(saveOrderGroupCalls[0].communityName, '大连市高新区凌水社区提货点');
  assert.equal(saveOrderGroupCalls[0].leaderName, '张三');
  assert.deepEqual(navigateToCalls, [
    {
      url: '/pages/mockPay/mockPay?orderId=1002&orderNo=ORDER-GROUP-002&totalAmount=180.00&receiverName=%E5%BC%A0%E4%B8%89&pricingLabel=3%E4%BA%BA%E5%9B%A2%E4%BB%B7'
    }
  ]);

  delete global.Page;
  delete global.wx;
  clearModule('../pages/orderConfirm/orderConfirm');
  clearModule('../utils/api');
  clearModule('../utils/storage');
  clearModule('../utils/mock-group');
});

test('orderList merges local mock group state into records', async () => {
  let pageOptions = null;

  const apiPath = require.resolve('../utils/api');
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
              orderNo: 'ORDER-GROUP-003',
              totalAmount: '200.00',
              orderStatus: 'UNPAID',
              orderItemList: [
                {
                  skuId: 301,
                  skuPrice: '100.00',
                  skuNum: 2,
                  skuName: '测试商品',
                  imgUrl: 'https://example.com/sku.png'
                }
              ],
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

  const storagePath = require.resolve('../utils/storage');
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

  const mockGroupPath = require.resolve('../utils/mock-group');
  require.cache[mockGroupPath] = {
    id: mockGroupPath,
    filename: mockGroupPath,
    loaded: true,
    exports: {
      getOrderGroupMap() {
        return {
          'ORDER-GROUP-003': {
            orderNo: 'ORDER-GROUP-003',
            skuId: 301,
            groupSize: 3,
            pricingMode: 'group3',
            joinedCount: 1,
            status: 'pending',
            displayPrice: '90.00',
            displayTotalAmount: '180.00',
            communityName: '大连市高新区凌水社区',
            leaderName: '张三'
          }
        };
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

  assert.equal(pageInstance.data.records[0].groupStatusText, '拼团中');
  assert.equal(pageInstance.data.records[0].groupProgressText, '3人团，还差2人');
  assert.equal(pageInstance.data.records[0].pricingLabel, '3人团价');
  assert.equal(pageInstance.data.records[0].totalAmountText, '180.00');
  assert.equal(pageInstance.data.records[0].payTotalAmount, '180.00');
  assert.equal(pageInstance.data.records[0].orderItemList[0].displaySkuPrice, '90.00');
  assert.equal(pageInstance.data.records[0].communityText, '大连市高新区凌水社区 · 张三带团');

  delete global.Page;
  clearModule('../pages/orderList/orderList');
  clearModule('../utils/api');
  clearModule('../utils/storage');
  clearModule('../utils/mock-group');
});

test('orderList invite action advances mock group progress', () => {
  const toastCalls = [];
  const inviteCalls = [];
  let pageOptions = null;

  const mockGroupPath = require.resolve('../utils/mock-group');
  require.cache[mockGroupPath] = {
    id: mockGroupPath,
    filename: mockGroupPath,
    loaded: true,
    exports: {
      markGroupInviteProgress(orderNo) {
        inviteCalls.push(orderNo);
        return {
          orderNo,
          groupSize: 3,
          joinedCount: 3,
          status: 'success'
        };
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
    }
  };

  clearModule('../pages/orderList/orderList');
  require('../pages/orderList/orderList');

  let refreshCalled = false;
  pageOptions.onInviteGroup.call({
    resetAndLoad() {
      refreshCalled = true;
      return Promise.resolve();
    }
  }, {
    currentTarget: {
      dataset: {
        orderNo: 'ORDER-GROUP-003'
      }
    }
  });

  assert.deepEqual(inviteCalls, ['ORDER-GROUP-003']);
  assert.equal(toastCalls[0].title, '邻里已参团，当前拼团已成团');
  assert.equal(refreshCalled, true);

  delete global.Page;
  delete global.wx;
  clearModule('../pages/orderList/orderList');
  clearModule('../utils/mock-group');
});
