const api = require('../../utils/api');
const storage = require('../../utils/storage');
const mockGroup = require('../../utils/mock-group');
const community = require('../../utils/community');
const { definePage } = require('../../utils/mp-guard');

const DEFAULT_RECEIVER_NAME = '张三';
const DEFAULT_RECEIVER_PHONE = '18888888888';
const DEFAULT_LEADER_ADDRESS = {
  takeName: community.DALIAN_PICKUP_NAME,
  detailAddress: community.DALIAN_PICKUP_ADDRESS,
  leaderName: '张三'
};

function toNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatAmount(value) {
  return (Math.round((toNumber(value) + Number.EPSILON) * 100) / 100).toFixed(2);
}

function flattenCheckedItems(carInfoVoList) {
  const items = [];
  (carInfoVoList || []).forEach((group) => {
    (group.cartInfoList || []).forEach((sku) => {
      if (sku.isChecked === 1) items.push(sku);
    });
  });
  return items;
}

function buildMockPayUrl(payload) {
  const query = [
    `orderId=${encodeURIComponent(payload.orderId || '')}`,
    `orderNo=${encodeURIComponent(payload.orderNo || '')}`,
    `totalAmount=${encodeURIComponent(payload.totalAmount || '0.00')}`,
    `receiverName=${encodeURIComponent(payload.receiverName || '')}`
  ];

  if (payload.pricingLabel) {
    query.push(`pricingLabel=${encodeURIComponent(payload.pricingLabel)}`);
  }

  return `/pages/mockPay/mockPay?${query.join('&')}`;
}

function getGroupSizeFromDraft(draft) {
  if (!draft) return 0;
  return Number(draft.groupSize) === 3 ? 3 : 2;
}

function resolvePricingLabel(groupSize) {
  return Number(groupSize) === 3 ? '3人团价' : '2人团价';
}

function sumItemQuantity(items = []) {
  return items.reduce((sum, item) => sum + Math.max(Number(item.skuNum) || 0, 1), 0);
}

function sumItemAmount(items = []) {
  return items.reduce((sum, item) => sum + toNumber(item.cartPrice || item.skuPrice) * Math.max(Number(item.skuNum) || 0, 1), 0);
}

function buildPricingState(items = [], orderTotalAmount, draftGroup) {
  const originalTotalAmount = formatAmount(orderTotalAmount);
  if (!draftGroup) {
    return {
      hasGroupPricing: false,
      selectedGroupSize: 0,
      pricingMode: '',
      pricingLabel: '',
      groupSkuId: 0,
      originalPrice: '0.00',
      displayPrice: '0.00',
      originalTotalAmount,
      totalAmount: originalTotalAmount,
      savingsAmount: '0.00'
    };
  }

  const groupSkuId = Number(draftGroup.skuId) || 0;
  const matchedItems = items.filter((item) => !groupSkuId || Number(item.skuId) === groupSkuId);
  const scopedItems = matchedItems.length > 0 ? matchedItems : items;
  const scopedQuantity = sumItemQuantity(scopedItems);
  const scopedOriginalAmount = matchedItems.length > 0 ? sumItemAmount(scopedItems) : toNumber(orderTotalAmount);
  const originalPrice = formatAmount(draftGroup.originalPrice || draftGroup.displayPrice);
  const displayPrice = formatAmount(draftGroup.displayPrice || draftGroup.originalPrice);
  const displayTotalAmount = scopedQuantity > 0
    ? formatAmount(toNumber(orderTotalAmount) - scopedOriginalAmount + toNumber(displayPrice) * scopedQuantity)
    : originalTotalAmount;

  return {
    hasGroupPricing: true,
    selectedGroupSize: getGroupSizeFromDraft(draftGroup),
    pricingMode: draftGroup.pricingMode || (Number(draftGroup.groupSize) === 3 ? 'group3' : 'group2'),
    pricingLabel: resolvePricingLabel(draftGroup.groupSize),
    groupSkuId,
    originalPrice,
    displayPrice,
    originalTotalAmount,
    totalAmount: displayTotalAmount,
    savingsAmount: formatAmount(Math.max(toNumber(originalTotalAmount) - toNumber(displayTotalAmount), 0))
  };
}

function withLeaderFallback(leaderAddressVo = {}) {
  const normalized = community.normalizePickupLocation(leaderAddressVo);
  return {
    ...normalized,
    leaderName: normalized.leaderName || DEFAULT_LEADER_ADDRESS.leaderName
  };
}

definePage({
  data: {
    orderNo: '',
    leaderAddressVo: { ...DEFAULT_LEADER_ADDRESS },
    items: [],
    totalAmount: '0.00',
    originalTotalAmount: '0.00',
    savingsAmount: '0.00',
    receiverName: DEFAULT_RECEIVER_NAME,
    receiverPhone: DEFAULT_RECEIVER_PHONE,
    selectedGroupSize: 0,
    pricingMode: '',
    pricingLabel: '',
    originalPrice: '0.00',
    displayPrice: '0.00',
    groupSkuId: 0,
    hasGroupPricing: false,
    submitting: false
  },

  onShow() {
    this.loadConfirmOrder();
  },

  async loadConfirmOrder() {
    const token = storage.getToken();
    if (!token) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    try {
      const order = await api.getConfirmOrder();
      const draftGroup = mockGroup.getDraftGroup();
      const items = flattenCheckedItems(order.carInfoVoList || []);
      const pricingState = buildPricingState(items, order.totalAmount, draftGroup);

      const localPickup = storage.getPickupLocation() || {};
      const serverLeaderAddressVo = order && order.leaderAddressVo ? order.leaderAddressVo : null;
      const serverLeaderId = Number(serverLeaderAddressVo && (serverLeaderAddressVo.leaderId || serverLeaderAddressVo.id));
      const localLeaderId = Number(localPickup && (localPickup.leaderId || localPickup.id));

      let leaderAddressVo = serverLeaderAddressVo || localPickup || {};
      if (Number.isFinite(serverLeaderId) && serverLeaderId > 0) {
        leaderAddressVo = serverLeaderAddressVo;
        storage.setPickupLocation(serverLeaderAddressVo);
      } else if (Number.isFinite(localLeaderId) && localLeaderId > 0) {
        leaderAddressVo = localPickup;
        try {
          const synced = await api.getSelectLeader({ leaderId: localLeaderId });
          if (synced) {
            leaderAddressVo = synced;
            storage.setPickupLocation(synced);
          }
        } catch (err) {
          console.error(err);
        }
      }

      this.setData({
        orderNo: order.orderNo || '',
        leaderAddressVo: withLeaderFallback(leaderAddressVo),
        items,
        totalAmount: pricingState.totalAmount,
        originalTotalAmount: pricingState.originalTotalAmount,
        savingsAmount: pricingState.savingsAmount,
        receiverName: this.data.receiverName || DEFAULT_RECEIVER_NAME,
        receiverPhone: this.data.receiverPhone || DEFAULT_RECEIVER_PHONE,
        selectedGroupSize: pricingState.selectedGroupSize,
        pricingMode: pricingState.pricingMode,
        pricingLabel: pricingState.pricingLabel,
        originalPrice: pricingState.originalPrice,
        displayPrice: pricingState.displayPrice,
        groupSkuId: pricingState.groupSkuId,
        hasGroupPricing: pricingState.hasGroupPricing
      });
    } catch (e) {
      console.error(e);
    }
  },

  onNameInput(e) {
    this.setData({ receiverName: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ receiverPhone: e.detail.value });
  },

  async onSubmit() {
    if (this.data.submitting) return;

    const leaderAddressVo = this.data.leaderAddressVo || {};
    const leaderId = Number(leaderAddressVo.leaderId || leaderAddressVo.id);
    if (!Number.isFinite(leaderId) || leaderId <= 0) {
      wx.showToast({ title: '请先选择社区提货点', icon: 'none' });
      wx.navigateTo({ url: '/pages/pickupLocation/pickupLocation' });
      return;
    }

    const receiverName = String(this.data.receiverName || DEFAULT_RECEIVER_NAME).trim() || DEFAULT_RECEIVER_NAME;
    const receiverPhone = String(this.data.receiverPhone || DEFAULT_RECEIVER_PHONE).trim() || DEFAULT_RECEIVER_PHONE;
    if (!receiverName) {
      wx.showToast({ title: '请输入提货人姓名', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(receiverPhone)) {
      wx.showToast({ title: '请输入正确手机号', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const syncedLeader = await api.getSelectLeader({ leaderId });
      const nextLeaderAddressVo = withLeaderFallback(syncedLeader || leaderAddressVo);
      if (syncedLeader) {
        storage.setPickupLocation(syncedLeader);
        this.setData({ leaderAddressVo: nextLeaderAddressVo });
      }

      const orderId = await api.postSubmitOrder({
        couponId: 0,
        leaderId,
        orderNo: this.data.orderNo,
        receiverName,
        receiverPhone
      });

      const draftGroup = mockGroup.consumeDraftGroup ? mockGroup.consumeDraftGroup() : mockGroup.getDraftGroup();
      if (draftGroup) {
        mockGroup.saveOrderGroup({
          orderNo: this.data.orderNo,
          orderId,
          skuId: Number(draftGroup.skuId) || this.data.groupSkuId || 0,
          groupSize: getGroupSizeFromDraft(draftGroup || { groupSize: this.data.selectedGroupSize }),
          pricingMode: draftGroup.pricingMode || this.data.pricingMode,
          joinedCount: 1,
          status: 'pending',
          originalPrice: draftGroup.originalPrice || this.data.originalPrice,
          displayPrice: draftGroup.displayPrice || this.data.displayPrice,
          originalTotalAmount: this.data.originalTotalAmount,
          displayTotalAmount: this.data.totalAmount,
          communityName: nextLeaderAddressVo.takeName || DEFAULT_LEADER_ADDRESS.takeName,
          leaderName: nextLeaderAddressVo.leaderName || DEFAULT_LEADER_ADDRESS.leaderName
        });
      }

      wx.navigateTo({
        url: buildMockPayUrl({
          orderId,
          orderNo: this.data.orderNo,
          totalAmount: this.data.totalAmount,
          receiverName,
          pricingLabel: this.data.pricingLabel
        })
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.setData({ submitting: false });
    }
  }
});
