# 命令注入（Conmand Injection）案例分析

命令注入的原理就是将用户的输入作为命令直接执行，未进行严格校验，详细可参考[常见web漏洞——系统命令注入](https://dulinrain.github.io/web-security/%E5%B8%B8%E8%A7%81web%E6%BC%8F%E6%B4%9E%E2%80%94%E2%80%94%E7%B3%BB%E7%BB%9F%E5%91%BD%E4%BB%A4%E6%B3%A8%E5%85%A5.html) 。

![](https://github.com/DuLinRain/pictures/blob/master/command_injection/command_injection_1.png?raw=true)

![](https://github.com/DuLinRain/pictures/blob/master/command_injection/command_injection_2.png?raw=true)

### 漏洞分析
[get-npm-package-version](https://www.npmjs.com/package/get-npm-package-version) 这个包的作用是用户指定npm包名和仓库，该命令可以查找到该包对应的版本。内部实际上是通过`npm view pkgname version --registry xxx `命令来实现的：

	module.exports = function (packageName, { registry = '', timeout = null } = {}) {
	    try {
	        if (/[`$&{}[;|]/g.test(packageName) || /[`$&{}[;|]/g.test(registry)) {
	            return null
	        }
	        let version;
	
	        const config = {
	            stdio: ['pipe', 'pipe', 'ignore']
	        };
	
	        if (timeout) {
	            config.timeout = timeout;
	        }
	
	        if (registry) {
	            version = require('child_process').execSync(`npm view ${packageName} version --registry ${registry}`, config);
	        } else {
	            version = require('child_process').execSync(`npm view ${packageName} version`, config);
	        }
	
	        if (version) {
	            return version.toString().trim().replace(/^\n*/, '').replace(/\n*$/, '');
	        } else {
	            return null;
	        }
	
	    } catch(err) {
	        return null;
	    }
	}
	
但是由于这里对用户的输入没有做任何的校验，导致可能存在命令注入攻击：

	// 这里简单测试echo命令
	const getVersion = require('get-npm-package-version');
	console.log('version', getVersion('get-npm-package-version version; echo hehe; npm view get-npm-package-version'))
	
	
输出：

![](https://github.com/DuLinRain/pictures/blob/master/command_injection/command_injection_3.png?raw=true)

可以看到命令被执行了。

### 修复方式
对输入做校验：

![](https://github.com/DuLinRain/pictures/blob/master/command_injection/command_injection_4.png?raw=true)

已经在**1.0.7**版本修复了。