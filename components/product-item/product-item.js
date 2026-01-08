Component({
  properties: {
    item: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onTap() {
      const item = this.properties.item || {};
      const skuId = item.id || item.skuId;
      this.triggerEvent('tap', { skuId });
    },
    onAdd() {
      const item = this.properties.item || {};
      const skuId = item.id || item.skuId;
      this.triggerEvent('add', { skuId });
    }
  }
});

