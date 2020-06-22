import fetch from '../../fetch/index.js';
import { formatTime } from '../../utils/util.js';
const app = getApp();

Page({
  data: {
    networkAvailable: true, // 网络状态
    // 交易类型（key对应icon图标和提示文字）
    refundType: {
      alipay: '支付宝支付',
      wx: '微信支付',
      unionpay: '云闪付'
    },
    isFilters: false,
    shopName: '',//店名
    // 筛选条件对应字段
    payType: [
      { 'name': "全部", 'value': '' },
      { 'name': "微信支付", 'value': 'wx' },
      { 'name': "支付宝支付", 'value': 'alipay' }
    ],
    payState: [
      { 'name': "全部", 'value': '' },
      { 'name': "成功", 'value': '00' },
      { 'name': "失败", 'value': '09' },
      { 'name': "退款中", 'value': '08' },
      { 'name': "已退款", 'value': '03' }
    ],
    // 筛选字段
    filterType: '',
    filterState: '',
    filterStartDate: '',
    filterEndDate: '',
    rangeStartDate: '',
    rangeEndDate: '',
    // 交易结果映射表 label 交易类型 cls对应不同类型的类名 re不同的类型的金额取值字段
    orderStateType: {
      '00': {
        '00': { label: '交易成功', cls: 'trade', re: 'tradeAmt', syl: '+' },
        '08': { label: '交易成功', cls: 'noRefund', re: 'tradeAmt', syl: '+' },
        '90': { label: '交易成功', cls: 'noRefund', re: 'tradeAmt', syl: '+' },
        '91': { label: '部分退款', cls: 'noRefund', re: 'tradeAmt', syl: '+' }
      },
      '03': { label: '退款成功', cls: 'refund', re: 'refundAmt', syl: '-' },
      '08': { label: '退款中', cls: 'refund', re: 'refundAmt', syl: '-' },
      '09': { label: '支付失败', cls: 'refund', re: 'tradeAmt', syl: '-' },
      '9': { label: '退款失败', cls: 'refund', re: 'refundAmt', syl: '-' }
    },
    // 交易列表数据
    refundList: [],
    noMore: false,
    lastTradeTime: '',
    statistics: {},//汇总信息
    isRefundBack: false,
    statisticsFlag: false,
    listFlag: false
  },
  onLoad(ops) {
    this.init();
  },
  onShow() {
    // 判断是否是退款页面返回，是则刷新页面
    const { isRefundBack } = this.data;

    if (isRefundBack) {
      this.resetFilter();
      this.init()
    }
    console.log('record app.cacheInfo:', app.getCacheInfo());
  },
  onHide() {
    this.setData({ isRefundBack: false });
  },
  // 下拉刷新
  onPullDownRefresh() {
    const date = formatTime(new Date());
    const self = this;

    this.setData({
      filterStartDate: date,//初始化默认记录起始时间为当天
      filterEndDate: date,
      rangeEndDate: date,
      refundList: [],
      listFlag: false,
      statisticsFlag: false
    }, () => {
      self.getRefundList();
      self.getstatistics();
    });

    let pullTimer = null;
    let count = 0;

    pullTimer = setInterval(() => {
      count++;
      const { listFlag, statisticsFlag } = self.data;
      if (count > 10) {
        clearInterval(pullTimer);
        wx.stopPullDownRefresh();
        return;
      }
      if (listFlag && statisticsFlag) {
        clearInterval(pullTimer);
        wx.stopPullDownRefresh();
      }
    }, 1000);
  },
  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    if (this.data.noMore) return;
    const { lastTradeTime } = this.data;
    this.getRefundList(lastTradeTime);
  },
  // 初始化数据
  init() {
    const date = formatTime(new Date());
    const info = app.getCacheInfo();
    const self = this;
    const { shopName } = info;

    this.setData({
      filterStartDate: date,//初始化默认记录起始时间为当天
      filterEndDate: date,
      rangeEndDate: date,
      shopName,
      refundList: []
    }, () => {
      self.getRefundList();
      self.getstatistics();
    });
  },
  // 获取交易列表数据
  getRefundList(lastTradeTime = '') {
    const { filterType, filterState, filterStartDate, filterEndDate } = this.data;
    const { version, deviceFlag } = app.globalData;
    const info = app.getCacheInfo();
    const { mchId, shopId, cashierId, terminalNo } = info;
    let noMore = false;
    const params = {
      version,
      deviceFlag,
      service: "mch_tradelist_query",
      queryStartDate: filterStartDate,
      queryEndDate: filterEndDate,
      channel: filterType, //支付方式
      orderState: filterState, //支付状态
      lastTradeTime,
      mchId,//商户id
      pageSize: '10',
      shopId,//门店ID
      cashierId,//收银员ID
      terminalNo //设备号
    };

    const self = this;
    // 获取交易列表
    fetch
      .gateway(params)
      .then((res) => {
        this.setData({ listFlag: true });
        let { refundList } = this.data;
        // 新请求的数据
        const listStr = res.data.orderList || '[]';
        const list = JSON.parse(listStr);

        // 判断当前数据是否少于pageSize
        if (!list.length || list.length < 10) noMore = true;//无数据时
        refundList = refundList.concat(list);
        // 记录上一次最后一条数据的时间
        const preveTime = (list.pop() || {}).finishTime || '';
        this.setData({ refundList, noMore, lastTradeTime: preveTime });
      })
      .catch(() => {
        this.setData({ noMore: true });
      })
  },
  // 筛选显隐
  goToToggleFilters() {
    this.setData({
      isFilters: true
    });
  },
  closeFiltersModel() {
    this.setData({
      isFilters: false
    });
  },
  // 选择筛选条件
  checkFilterType(e) {
    const { val, type } = e.currentTarget.dataset;
    this.setData({
      [`filter${type}`]: val
    });
  },
  // 筛选时间选择
  checkFilterDate(e) {
    const { value } = e.detail;
    const { type } = e.currentTarget.dataset;
    this.setData({
      [`filter${type}Date`]: value
    });
  },
  //获取汇总信息
  getstatistics() {
    const self = this;
    const { deviceFlag, version } = app.globalData;
    const { filterType, filterStartDate, filterEndDate } = this.data;
    const info = app.getCacheInfo();
    const { terminalNo, role, cashierId, mchId, shopId } = info;
    let params = {
      deviceFlag,
      version,
      channel: filterType,
      queryStartDate: filterStartDate,
      queryEndDate: filterEndDate,
      role,
      cashierId,
      mchId,//商户ID
      shopId,//门店ID
      terminalNo,
      service: "trans_sum"
    };

    fetch
      .gateway(params)
      .then(res => {
        self.setData({
          statistics: res.data,
          statisticsFlag: true
        })
      })
  },
  resetFilter() {
    const date = formatTime(new Date());
    this.setData({
      filterType: '',
      filterState: '',
      filterStartDate: date,
      filterEndDate: date
    });
  },
  submitFilter() {
    this.setData({ refundList: [], isFilters: false });
    this.getRefundList();
    this.getstatistics();
  },
  goToRefundDetial(e) {
    const { refund } = e.currentTarget.dataset;

    app.globalData.refundInfo = refund;
    wx.navigateTo({
      url: `/pages/detail/detail?orderState=${refund.orderState}&refundState=${refund.refundState}`
    })
  }
})