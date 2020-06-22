let timer = null;

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    countTime: {
      type: Number,
      value: 12
    },
    clear: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {

  },
  observers: {
    clear(v) {
      const self = this;
      if (v) {
        clearInterval(timer);
        console.log(v);
        self.triggerEvent('clear');
        console.log('关')
      } else {
        self.statrTimer();
        console.log('开')
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    statrTimer() {
      clearInterval(timer);
      const self = this;
      timer = setInterval(() => {
        self.data.countTime--;
        self.setData({ countTime: self.data.countTime });
        if (self.data.countTime) return;
        clearInterval(timer);
        console.log('start 关')
        self.triggerEvent('clear');
      }, 1000);
    }
  }
})
