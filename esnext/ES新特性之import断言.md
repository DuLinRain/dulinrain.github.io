# ES新特性之import断言
新的import断言特性允许模块引入语句在模块标识符处包含额外的信息。一个最初始的用处是引入JSON时使它是一个json模块。

	// foo.json
	{ "answer": 42 }
	

#

	// main.mjs
	import json from './foo.json' assert { type: 'json' };
	console.log(json.answer); // 42
	
### 背景：JSON模块和MIME类型
一个自然要问的问题是为什么不能像下面这样简单地导入 JSON 模块：

	import json from './foo.json';
	
web平台会在执行模块资源之前先检查模块的MIME类型的有效性。理论上该 MIME 类型也可用于确定将资源视为 JSON 还是 JavaScript 模块。

但是如果仅仅只依赖MIME类型会有[安全问题](https://github.com/WICG/webcomponents/issues/839)。

模块可能会被跨域引入，开发者也可能引入第三方JSON模块。他们可能认为即使对于不受信任的第三方，只要 JSON 得到适当的处理，这也基本上是安全的，因为导入 JSON 不会执行脚本。

但是，第三方脚本实际上可以在这种情况下执行，因为第三方服务器可能会不按预期地响应JavaScript MIME 类型和恶意 JavaScript 负载，在引入该模块资源的域中执行代码。

	// Executes JS if evil.com responds with a
	// JavaScript MIME type (e.g. `text/javascript`)!
	import data from 'https://evil.com/data.json';
	
文件扩展名不能用于确定模块类型，因为它们不是web上内容类型的可靠指标。因此，我们使用import断言来指示预期的模块类型并防止这种权限提升陷阱。

当开发者想引入JSON模块时，他们必须使用import断言来指示它是JSON。如果从网络收到的 MIME 类型与预期类型不匹配，则导入将失败：

	// Fails if evil.com responds with a non-JSON MIME type.
	import data from 'https://evil.com/data.json' assert { type: 'json' };

### Dynamic import

import断言也可以用于Dynamic import，在第二个参数中使用：

	// foo.json
	{ "answer": 42 }
	
#

	// main.mjs
	const jsonModule = await import('./foo.json', {
	  assert: { type: 'json' }
	});
	console.log(jsonModule.default.answer); // 42

JSON内容是模块的默认导出。因此通过 `import()` 返回的对象上的`default`属性引用它。

### 结论
目前，import断言的唯一指定用途是指定模块类型。但是，该功能旨在允许任意键/值断言对，因此如果以其他方式限制模块导入变得有用，将来可能会添加其他用途。

同时，具有新导入断言语法的 JSON 模块在 Chromium 91 中默认可用。 CSS 模块脚本也即将推出，使用相同的模块类型断言语法。

### 支持情况

![](https://github.com/DuLinRain/pictures/blob/master/esnext/import_assert.png?raw=true)




