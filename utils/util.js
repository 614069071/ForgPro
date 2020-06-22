import { appId } from '../config'

// 序列化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  // return [year, month, day].map(formatNumber).join('-') + ' ' + [hour, minute, second].map(formatNumber).join(':')
  return [year, month, day].map(formatNumber).join('-');
}

// 统一格式
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// 倒计时
let timer = null;

const clearCountdown = () => {
  clearInterval(timer);
}

const countdown = (self, callback) => {
  clearCountdown();
  timer = setInterval(() => {
    self.data.countTime--;
    self.setData({ countTime: self.data.countTime });
    if (self.data.countTime) return;
    clearCountdown();
    callback && callback();
  }, 1000);
}

//获取随机数
const getRandom = (min, max) => {
  let returnStr = "";
  let range = (max ? Math.round(Math.random() * (max - min)) + min : min);
  const arr = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (var i = 0; i < range; i++) {
    var index = Math.round(Math.random() * (arr.length - 1));
    returnStr += arr[index];
  }
  return returnStr;
};

//校验必填字段
const validate = info => {
  let count = 0;
  for (var i in info) {
    if (!info[i]) {
      wx.showToast({
        icon: 'none',
        title: '请将信息填写完整！',
        duration: 3000,
        success: () => { }
      });
      count++;
    } else {
      if (i == 'userName' && info[i] && (!/^1[3456789]\d{9}$/.test(info[i]))) {
        wx.showToast({
          icon: 'none',
          title: '手机号码格式有误！！',
          duration: 3000,
          success: () => { }
        });
        count++;
      }
    }
  }
  return count;
}

// 缓存文件
const fs = wx.getFileSystemManager();
const path = wx.env.USER_DATA_PATH + '/info.txt';
const fsm = {
  set(info, callback, failFn) {
    let str = '';
    str = typeof info === 'object' ? JSON.stringify(info) : info;
    fs.writeFile({
      filePath: path,
      data: str,
      encoding: 'utf8',
      success() {
        callback && callback();
      },
      fail(err) {
        if (failFn) {
          failFn(err);
        }
        console.log('err');
      }
    });
  },
  get() {
    let data = null;
    try {
      data = fs.readFileSync(path, 'utf8');
    } catch (e) {
      fsm.set({});
      return {};
    }
    return JSON.parse(data);
  },
  remove() {
    fs.readdir({  // 获取文件列表
      dirPath: wx.env.USER_DATA_PATH,// 当时写入的文件夹
      success(res) {
        res.files.length && res.files.forEach((el) => {
          if (el === 'miniprogramLog') return;//不删除日志文件
          // 删除存储的垃圾数据
          fs.unlink({
            filePath: `${wx.env.USER_DATA_PATH}/${el}`,
            success(res) {
              console.log(res, 'unlink');
            },
            fail(e) {
              console.log('readdir文件删除失败：', e)
            }
          });
        })
      },
      fail(err) {
        console.log(err, 'readdir err');
      }
    })
  }
}

// 下载图片存储到本地
// arr 要下载的图片地址数组
function downloadFile(arr) {
  let resArr = [];
  return new Promise((resolve, reject) => {
    arr.forEach((ele, index) => {
      wx.downloadFile({
        url: ele,
        success(res) {
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success(res) {
              resArr.push(res.savedFilePath);
              if (index === arr.length - 1) {
                resolve(resArr);
                console.log(res, 'saveFile suc');
              }
            },
            fail(err) {
              console.log(err, 'saveFile err');
              reject(err);
            }
          })
        },
        fail(err) {
          console.log(err, 'download err');
        }
      })
    })
  })
}

// 删除所有存储的文件
function removeSavedFile() {
  wx.getSavedFileList({
    success(savedFileInfo) {
      let list = savedFileInfo.fileList
      list.forEach(ele => {
        wx.removeSavedFile({
          filePath: ele.filePath,
          success() {
            console.log('removeSavedFile success');
          },
          fail(err) {
            console.log('removeSavedFile err', err);
          }
        })
      })
    }
  })
}

// 获取存储文件列表
function getSavedFileList() {
  return new Promise((resolve, reject) => {
    wx.getSavedFileList({
      success(savedFileInfo) {
        const dealArr = savedFileInfo.fileList.map(ele => ele.filePath) || [];
        resolve(dealArr);
      },
      fail(err) {
        console.log('getSavedFileList', err);
        reject(err);
      }
    })
  })
}

// 广告排序
const sort = arr => {
  for (var j = 0; j < arr.length - 1; j++) {
    for (var i = 0; i < arr.length - 1 - j; i++) {
      if (arr[i].sequence > arr[i + 1].sequence) {
        var temp = arr[i];
        arr[i] = arr[i + 1];
        arr[i + 1] = temp;
      }
    }
  }
  return arr;
}

// 发送消息
const faceSendMes = (data, successFn, failFn) => {
  const content = typeof data === 'object' ? JSON.stringify(data) : data;
  wxfaceapp.postMsg({
    targetAppid: appId,
    content,
    success(res) {
      if (successFn) {
        successFn(res);
        return
      }
      console.log('发送成功');
    },
    fail(err) {
      if (failFn) {
        failFn(err);
        return;
      }
      console.log('发送失败', err);
    }
  })
}

// 接受消息
const faceListenMes = callback => {
  wxfaceapp.onRemoteMessage(res => {
    //接受到的消息
    const info = JSON.parse(res.content);
    callback(info);
  })
}

// 节流
function throttle(fn, wait = 1000) {
  let cacheTime = 0;//触发的时间
  return function () {
    let currentTime = + new Date();
    if (currentTime - cacheTime > wait || !cacheTime) {
      fn.apply(this, arguments);
      cacheTime = currentTime;
    }
  };
}


//连续点击多次后执行
let hideGoLoginCount = 0;
let hideGoLoginTimer = null;

function manyClickExecute(callback, count = 3000, num = 8) {
  hideGoLoginCount++;
  clearTimeout(hideGoLoginTimer);
  hideGoLoginTimer = setTimeout(() => {
    hideGoLoginCount = 0;
    clearTimeout(hideGoLoginTimer);
  }, count);
  if (hideGoLoginCount >= num) {
    callback();
    clearTimeout(hideGoLoginTimer);
  }
}

module.exports = {
  formatTime, getRandom, countdown, clearCountdown, validate, fsm, sort, faceSendMes, faceListenMes, throttle,
  downloadFile, removeSavedFile, getSavedFileList, manyClickExecute
}
