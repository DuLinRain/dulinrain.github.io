# HTTP请求走私漏洞PoC
由于NodeJS内置基础库`http_parse`存在的漏洞，导致基于NodeJs很多版本部署的服务可能收到**请求走私攻击**。

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling1.png)

### 尝试复现
下面尝试证明Nodejs普遍存在的请求走私漏洞（在Node v10.7.0环境，本地测试）：

Controller代码如下：

    async index(ctx) {
        // console.log('index')
        ctx.body = {
            status: 0,
            message: 'ok',
            data: 'this is the first response from index'
        };
    }
    async index1(ctx) {
        ctx.body = {
            status: 0,
            message: 'ok',
            data: 'this is the second response from index1'
        };
    }

Router如下:

    router.post('/', controller.home.index);
    router.post('/index1', controller.home.index1);

通过POSTMAN发送请求

第一个请求：

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling2.png)

携带了第二个(指向`/index1`)不完整的请求，并且第一个请求(`/`)正常返回：

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling3.png)

输出的第一条日志：

    TRACE 2021-01-21 14:05:40,999 method=POST full_path=/ 

这时，再次用POSTMAN发起一个指向`/`的请求：

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling4.png)

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling5.png)


返回的响应是前一个请求走私的指向`/index1`的请求（也就是说你明明请求的是`/`接口，结果是`/index1`接口返回的响应）：

![](https://raw.githubusercontent.com/DuLinRain/pictures/master/http_smuggling6.png)


输出的第二条日志：

    TRACE 2021-01-21 14:05:43,588 method=POST full_path=/index1


### 漏洞修复
#### 第一次修复

该漏洞由ebay工程师首次报告，NodeJS官方在2020-02-06[第一次](https://nodejs.org/en/blog/vulnerability/february-2020-security-releases/)发布了该漏洞的修复版本（HTTP request smuggling using malformed Transfer-Encoding header (Critical) (CVE-2019-15605)），在修复版本下运行的话上面的请求都会返回**400**.

- 修复版本 v10的话  `>= v10.19.0`
- 修复版本 v12的话 `>= v12.15.0`
- 修复版本 v13的话  `>= v13.9.0`
- v11 有问题
- 时间 `>=2020.02.06`

#### 第二次修复

第一次修复后，Node里还是存在一定的问题，腾讯工程师再次报告了该漏洞（HTTP Request Smuggling in nodejs (Low) (CVE-2020-8287)），NodeJS在2021年1月4日[第二次](https://nodejs.org/en/blog/vulnerability/january-2021-security-releases/)发布了针对该漏洞的修复版本。

- 修复版本 v10的话  `>= v10.23.1`
- 修复版本 v12的话 `>= v12.20.1`
- 修复版本 v14的话  `>= v14.15.4`
- 修复版本 v15的话  `>= v15.5.1`
- 时间 `>=2021.01.04`