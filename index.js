const superagent = require('superagent')
const md5 = require('md5')
const cheerio = require('cheerio');

// nodejs 环境
// if (typeof $ === 'undefined') {
//     var superagent = require('superagent')
//     var md5 = require('md5')
//     var cheerio = require('cheerio');
// }
// 浏览器环境
// else {
//     var cheerio = {};
//     cheerio.load = function(content) {
//         let parser = new DOMParser();
//         return $(parser.parseFromString(content, "text/html")).find;
//     }
//     var md5 = $.md5;
// }

var heu = {}

module.exports = heu;

function proxy(request) {
    const CORS_PROXY = "test.qinglianjie.cn"
    // request.url = CORS_PROXY + request.url

    const [protocol, others] = request.url.split("//");
    let path = '/';
    let domain;
    let pos = others.indexOf("/");
    pos === -1 ?
        (domain = others) :
        (domain = others.split('/')[0], path = others.substring(pos));

    // console.log(protocol, domain, path)
    // console.log(protocol);

    // TODO: Add protocol to header
    request.url = `https://${domain}.${CORS_PROXY}${path}`
    return request
}

heu._agent = superagent.agent()
heu._agent.redirects(20)
heu._agent.withCredentials()
// heu._agent = heu._agent.disableTLSCerts()

// 使用 CORS-PROXY 代理
// heu._agent.use(proxy)

// heu app sign
heu._sign = function (e) {
    return md5(Object.keys(e).sort(function (e, t) {
        return e < t ? -1 : 1
    }).map(function (t) {
        return t + "=" + e[t]
    }).join("&"))
}

heu.loginHEUApp = function (username, password) {
    return new Promise(function (resolve, reject) {
        const data = {
            "appKey": "GiITvn",
            "param": `{"campusType":1,"userName":"${username}","password":"${password}",` +
                `"schoolId":"193","wxCode":null,"client":null,"openId":null}`,
            "time": 1646723574187,
            "secure": 0,
        }
        data.sign = heu._sign(data)
        console.log(data);
        heu._agent
            .post('https://ythxy.hrbeu.edu.cn/baseCampus/login/login.do')
            .send(data)
            // .use(proxy)
            .catch(err => {
                reject(err)
            })
            .then((res) => {
                const token = res.body['token'][0] + "_" + res.body['token'][1]
                console.log(token);
                heu._agent
                    // .use(proxy)
                    .get("https://ythxy.hrbeu.edu.cn/baseCampus/user/setUserCookies.do")
                    .query({"token": token})
                    .catch((err) => {
                        reject(err)
                    })
                    .then(res => {
                        // console.log(res);
                        Promise.all([
                            // 登录办事中心
                            // heu._agent
                            //     .get("http://one.hrbeu.edu.cn/infoplus/login")
                            //     .use(proxy)
                            //     .then((res)=>{})
                            //     .catch((err)=>{reject(err)}),
                            // 登录 cas
                            heu._agent
                                .get("https://cas.hrbeu.edu.cn/cas/login")
                                .then((res) => {
                                })
                                .catch((err) => {
                                    reject(err)
                                }),
                            // 登录 cas-443
                            heu._agent
                                .get("https://cas-443.wvpn.hrbeu.edu.cn/cas/login")
                                .then((res) => {
                                    console.log("fuck")
                                })
                                .catch((err) => {
                                    reject(err)
                                }),
                        ]).then(() => {
                            heu._agent
                                .get("https://edusys.wvpn.hrbeu.edu.cn/jsxsd/framework/main.jsp")
                                .catch((err) => {
                                    reject(err)
                                })
                                .then((res) => {
                                    // console.log(res);
                                    // Login success
                                    resolve()
                                })
                        }).catch((err) => {
                            reject(err)
                        })
                    })
            })
    })
}

heu.getScores = function () {
    return new Promise(function (resolve, reject) {
        heu._agent
            // .use(proxy)
            .get("https://edusys.wvpn.hrbeu.edu.cn/jsxsd/kscj/cjcx_list")
            .catch((err) => {
            })
            .then(res => {
                // console.log(res);
                const result = [];
                const $ = cheerio.load(res.text);
                $('#dataList').find('tr').each(function () {
                    const row = [];
                    $(this).find('td').each(function () {
                        row.push($(this).text())
                    })
                    row.length === 13 ? result.push(row) : 114514;
                })
                resolve(result);
            })
            .catch(err => reject(err));
    })
};

heu.getTimeTable = function (term) {
    return new Promise(function (resolve, reject) {
        const result = [], promises = [];
        for (let week = 1; week <= 30; week += 1) {
            result.push([]);
            promises.push(new Promise(function (resolve, reject) {
                heu._agent
                    .post("https://edusys.wvpn.hrbeu.edu.cn/jsxsd/xskb/xskb_list.do")
                    // Post by form (application/x-www-form-urlencoded)
                    .send(`xnxq01id=${term}`)
                    .send(`zc=${week}`)
                    .catch(err => reject(err))
                    .then((res) => {
                        // console.log(res)
                        // console.log(res.text)
                        const $ = cheerio.load(res.text);
                        const index = week;
                        const table = [];
                        $('#Form1').find('tr').each(function () {
                            // console.log($(this))
                            // 忽略表首
                            if ($(this).find('th').length === 1) {
                                const row = [];
                                const tds = $(this).find('td');
                                // 非表末
                                if (tds.length !== 1) {
                                    tds.each(function () {
                                        const ele = $(this).find('.kbcontent');
                                        const grid = [];
                                        let course = [];
                                        ele
                                            .html()
                                            .replaceAll('<br>', '\n')
                                            .replaceAll(/<(.*?)>/g, '')
                                            .replaceAll('&nbsp;', '')
                                            .split('\n')
                                            .forEach(function (val) {
                                                if (val.length) {
                                                    val === "---------------------" ?
                                                        (grid.push(course), course = []) :
                                                        course.push(val)
                                                }
                                            })
                                        if (course.length) grid.push(course);
                                        row.push(grid);
                                    });
                                }
                                // 表末备注
                                else {
                                    tds.text().split(";").forEach((val) => {
                                        const ps = val
                                            .replaceAll(" ", "")
                                            .replaceAll("\xa0", "");
                                        if (ps.length !== 0) row.push(ps)
                                    })
                                }
                                // console.log(row);
                                table.push(row);
                            }
                        })
                        result[index] = table;
                        // console.log(table)
                        resolve();
                    })
            }));
        }
        Promise
            .all(promises)
            .then(res => resolve(result))
            .catch(err => reject(err))
    })
}
