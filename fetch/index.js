// 接口封装
import { loginHttp, http } from './request';
import * as api from './api';

// 登录
const login = data => loginHttp(api.gateway, { data });
// 交易相关接口
const gateway = data => http(api.gateway, { data });
// 获取七分钱时间戳
const getTimeStamp = data => http(api.getTimeStamp, { data });

export default { login, gateway, getTimeStamp }