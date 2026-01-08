Component({
  properties: {
    value: { type: Number, value: 1 },
    min: { type: Number, value: 1 },
    max: { type: Number, value: 999 }
  },
  data: {
    inputValue: 1
  },
  observers: {
    value(v) {
      const n = Number(v);
      this.setData({ inputValue: Number.isFinite(n) ? n : 1 });
    }
  },
  methods: {
    clamp(n) {
      const min = Number(this.properties.min);
      const max = Number(this.properties.max);
      return Math.min(Math.max(n, min), max);
    },
    emitChange(nextValue) {
      const prevValue = Number(this.properties.value);
      const delta = nextValue - prevValue;
      this.setData({ inputValue: nextValue });
      this.triggerEvent('change', { value: nextValue, delta });
    },
    onMinus() {
      const current = Number(this.data.inputValue);
      const next = this.clamp(current - 1);
      if (next === current) return;
      this.emitChange(next);
    },
    onPlus() {
      const current = Number(this.data.inputValue);
      const next = this.clamp(current + 1);
      if (next === current) return;
      this.emitChange(next);
    },
    onInput(e) {
      this.setData({ inputValue: e.detail.value });
    },
    onBlur(e) {
      const raw = e.detail.value;
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        this.setData({ inputValue: this.properties.value });
        return;
      }
      const next = this.clamp(n);
      if (next === Number(this.properties.value)) {
        this.setData({ inputValue: next });
        return;
      }
      this.emitChange(next);
    }
  }
});

