/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var stylesInDom = {};

var	memoize = function (fn) {
	var memo;

	return function () {
		if (typeof memo === "undefined") memo = fn.apply(this, arguments);
		return memo;
	};
};

var isOldIE = memoize(function () {
	// Test for IE <= 9 as proposed by Browserhacks
	// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
	// Tests for existence of standard globals is to allow style-loader
	// to operate correctly into non-standard environments
	// @see https://github.com/webpack-contrib/style-loader/issues/177
	return window && document && document.all && !window.atob;
});

var getElement = (function (fn) {
	var memo = {};

	return function(selector) {
		if (typeof memo[selector] === "undefined") {
			memo[selector] = fn.call(this, selector);
		}

		return memo[selector]
	};
})(function (target) {
	return document.querySelector(target)
});

var singleton = null;
var	singletonCounter = 0;
var	stylesInsertedAtTop = [];

var	fixUrls = __webpack_require__(5);

module.exports = function(list, options) {
	if (typeof DEBUG !== "undefined" && DEBUG) {
		if (typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};

	options.attrs = typeof options.attrs === "object" ? options.attrs : {};

	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (!options.singleton) options.singleton = isOldIE();

	// By default, add <style> tags to the <head> element
	if (!options.insertInto) options.insertInto = "head";

	// By default, add <style> tags to the bottom of the target
	if (!options.insertAt) options.insertAt = "bottom";

	var styles = listToStyles(list, options);

	addStylesToDom(styles, options);

	return function update (newList) {
		var mayRemove = [];

		for (var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];

			domStyle.refs--;
			mayRemove.push(domStyle);
		}

		if(newList) {
			var newStyles = listToStyles(newList, options);
			addStylesToDom(newStyles, options);
		}

		for (var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];

			if(domStyle.refs === 0) {
				for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();

				delete stylesInDom[domStyle.id];
			}
		}
	};
};

function addStylesToDom (styles, options) {
	for (var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];

		if(domStyle) {
			domStyle.refs++;

			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}

			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];

			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}

			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles (list, options) {
	var styles = [];
	var newStyles = {};

	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = options.base ? item[0] + options.base : item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};

		if(!newStyles[id]) styles.push(newStyles[id] = {id: id, parts: [part]});
		else newStyles[id].parts.push(part);
	}

	return styles;
}

function insertStyleElement (options, style) {
	var target = getElement(options.insertInto)

	if (!target) {
		throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
	}

	var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];

	if (options.insertAt === "top") {
		if (!lastStyleElementInsertedAtTop) {
			target.insertBefore(style, target.firstChild);
		} else if (lastStyleElementInsertedAtTop.nextSibling) {
			target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			target.appendChild(style);
		}
		stylesInsertedAtTop.push(style);
	} else if (options.insertAt === "bottom") {
		target.appendChild(style);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement (style) {
	if (style.parentNode === null) return false;
	style.parentNode.removeChild(style);

	var idx = stylesInsertedAtTop.indexOf(style);
	if(idx >= 0) {
		stylesInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement (options) {
	var style = document.createElement("style");

	options.attrs.type = "text/css";

	addAttrs(style, options.attrs);
	insertStyleElement(options, style);

	return style;
}

function createLinkElement (options) {
	var link = document.createElement("link");

	options.attrs.type = "text/css";
	options.attrs.rel = "stylesheet";

	addAttrs(link, options.attrs);
	insertStyleElement(options, link);

	return link;
}

function addAttrs (el, attrs) {
	Object.keys(attrs).forEach(function (key) {
		el.setAttribute(key, attrs[key]);
	});
}

function addStyle (obj, options) {
	var style, update, remove, result;

	// If a transform function was defined, run it on the css
	if (options.transform && obj.css) {
	    result = options.transform(obj.css);

	    if (result) {
	    	// If transform returns a value, use that instead of the original css.
	    	// This allows running runtime transformations on the css.
	    	obj.css = result;
	    } else {
	    	// If the transform function returns a falsy value, don't add this css.
	    	// This allows conditional loading of css
	    	return function() {
	    		// noop
	    	};
	    }
	}

	if (options.singleton) {
		var styleIndex = singletonCounter++;

		style = singleton || (singleton = createStyleElement(options));

		update = applyToSingletonTag.bind(null, style, styleIndex, false);
		remove = applyToSingletonTag.bind(null, style, styleIndex, true);

	} else if (
		obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function"
	) {
		style = createLinkElement(options);
		update = updateLink.bind(null, style, options);
		remove = function () {
			removeStyleElement(style);

			if(style.href) URL.revokeObjectURL(style.href);
		};
	} else {
		style = createStyleElement(options);
		update = applyToTag.bind(null, style);
		remove = function () {
			removeStyleElement(style);
		};
	}

	update(obj);

	return function updateStyle (newObj) {
		if (newObj) {
			if (
				newObj.css === obj.css &&
				newObj.media === obj.media &&
				newObj.sourceMap === obj.sourceMap
			) {
				return;
			}

			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;

		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag (style, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (style.styleSheet) {
		style.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = style.childNodes;

		if (childNodes[index]) style.removeChild(childNodes[index]);

		if (childNodes.length) {
			style.insertBefore(cssNode, childNodes[index]);
		} else {
			style.appendChild(cssNode);
		}
	}
}

function applyToTag (style, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		style.setAttribute("media", media)
	}

	if(style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		while(style.firstChild) {
			style.removeChild(style.firstChild);
		}

		style.appendChild(document.createTextNode(css));
	}
}

function updateLink (link, options, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	/*
		If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
		and there is no publicPath defined then lets turn convertToAbsoluteUrls
		on by default.  Otherwise default to the convertToAbsoluteUrls option
		directly
	*/
	var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

	if (options.convertToAbsoluteUrls || autoFixUrls) {
		css = fixUrls(css);
	}

	if (sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = link.href;

	link.href = URL.createObjectURL(blob);

	if(oldSrc) URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__css_diffview_css__ = __webpack_require__(3);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__css_diffview_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0__css_diffview_css__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__css_style_css__ = __webpack_require__(6);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__css_style_css___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1__css_style_css__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__difflib_js__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__diffview_js__ = __webpack_require__(9);
/*
* @Author: Marte
* @Date:   2017-09-29 17:03:54
* @Last Modified by:   Marte
* @Last Modified time: 2017-10-12 12:19:00
*/




if(window.File && window.FileReader && window.FileList && window.Blob) {
    document.getElementById('Files1').addEventListener('change', fileSelect1, false);
    document.getElementById('Files2').addEventListener('change', fileSelect2, false);
    document.getElementById('btn').addEventListener('click', btnClicked, false);
} else {
    document.write('The File APIs are not fully supported in this browser.');
}
let results1 = new Map()
let results2 = new Map()
function fileSelect1(e) {
    results1.clear();
    e = e || window.event;
    var files = e.target.files;  //FileList Objects
    var output = [];
    for(var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();
        reader.onload = (function(file) {
            return function(e) {
                let result = this.result
                results1.set(file.name, result)
            };
        })(f);
        reader.readAsText(f);
        output.push('<li><strong>' + f.name + '</strong>(' + f.type + ') - ' + f.size +' bytes</li>');
    }
    document.getElementById('Lists1').innerHTML = '<ul class="live">' + output.join('') + '</ul>';
}
function fileSelect2(e) {
    results2.clear();
    e = e || window.event;
    var files = e.target.files;  //FileList Objects
    var output = [];
    for(var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader();
        reader.onload = (function(file) {
            return function(e) {
                let result = this.result
                results2.set(file.name, result)
            };
        })(f);
        reader.readAsText(f);
        output.push('<li><strong>' + f.name + '</strong>(' + f.type + ') - ' + f.size +' bytes</li>');
    }
    document.getElementById('Lists2').innerHTML = '<ul class="live">' + output.join('') + '</ul>';
}
function startdiffing (oldfiles = new Map(), newfiles = new Map()) {
    Object.prototype.toString.call(oldfiles) !== "[object Map]" && (oldfiles = new Map())
    Object.prototype.toString.call(newfiles) !== "[object Map]" && (newfiles = new Map())
    let domresults = []
    let unionKeys
    if (oldfiles.size === 1 && newfiles.size === 1) {
        unionKeys = [...oldfiles.keys(), ...newfiles.keys()]
        let oldfile = oldfiles.get(unionKeys[0])
        let newfile = newfiles.get(unionKeys[1])
        domresults.push(diffUsingJS({
            viewType: 0,
            oldfile,
            newfile,
            oldfilename: unionKeys[0],
            newfilename: unionKeys[1]
        }))
        return domresults
    }
    unionKeys = new Set([...oldfiles.keys(), ...newfiles.keys()])
    for (let name of unionKeys) {
        let oldfile = oldfiles.get(name)
        let newfile = newfiles.get(name)
        domresults.push(diffUsingJS({
            viewType: 0,
            oldfile,
            newfile,
            oldfilename: oldfile === void 0 ? '无此文件' :
                newfile === void 0 ? name + '(删除)' :
                name,
            newfilename: newfile === void 0 ? '无此文件' :
                oldfile === void 0 ? name + '(新增)' :
                name
        }))
    }
    return domresults
}
function hnode (name, clazz, text) {
    let e = document.createElement(name);
    e.className = clazz;
    e.appendChild(hnodetext(text))
    return e;
}
function hnodetext (text) {
    return document.createTextNode(text)
}
function btnClicked () {
    let domresults = startdiffing(results1, results2)
    let targetdom = document.querySelector('#results')
    targetdom.innerHTML = ''
    if (domresults.length === 0) {
        targetdom.appendChild(hnode('h2', 'title', '暂无比对结果，请确认是否选择文件'))
        return
    }
    targetdom.appendChild(hnode('h2', 'title', '比对结果'))
    for (let domresult of domresults) {
        targetdom.appendChild(domresult)
    }
}
function diffUsingJS(options = {}) {
    //处理options不是一个对象字面量的情况
    if (Object.prototype.toString.call(options) !== '[object Object]') {
        options = {}
    }
    let { oldfile = '', newfile = '', viewType = 0, contextSize = null, oldfilename, newfilename } = options
    let base = __WEBPACK_IMPORTED_MODULE_2__difflib_js__["a" /* difflib */].stringAsLines(oldfile)
    let newtxt = __WEBPACK_IMPORTED_MODULE_2__difflib_js__["a" /* difflib */].stringAsLines(newfile)
    let sm = new __WEBPACK_IMPORTED_MODULE_2__difflib_js__["a" /* difflib */].SequenceMatcher(base, newtxt)
    let opcodes = sm.get_opcodes()
    return __WEBPACK_IMPORTED_MODULE_3__diffview_js__["a" /* diffview */].buildView({
        baseTextLines: base,
        newTextLines: newtxt,
        opcodes: opcodes,
        baseTextName: oldfilename,
        newTextName: newfilename,
        contextSize: contextSize,
        viewType: viewType
    })
}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(4);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(1)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!./diffview.css", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!./diffview.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)(undefined);
// imports


// module
exports.push([module.i, "/*\nThis is part of jsdifflib v1.0. <http://github.com/cemerick/jsdifflib>\n\nCopyright 2007 - 2011 Chas Emerick <cemerick@snowtide.com>. All rights reserved.\n\nRedistribution and use in source and binary forms, with or without modification, are\npermitted provided that the following conditions are met:\n\n   1. Redistributions of source code must retain the above copyright notice, this list of\n      conditions and the following disclaimer.\n\n   2. Redistributions in binary form must reproduce the above copyright notice, this list\n      of conditions and the following disclaimer in the documentation and/or other materials\n      provided with the distribution.\n\nTHIS SOFTWARE IS PROVIDED BY Chas Emerick ``AS IS'' AND ANY EXPRESS OR IMPLIED\nWARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND\nFITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Chas Emerick OR\nCONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR\nCONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\nSERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON\nANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING\nNEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF\nADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\nThe views and conclusions contained in the software and documentation are those of the\nauthors and should not be interpreted as representing official policies, either expressed\nor implied, of Chas Emerick.\n*/\n\ntable.diff {\n\tborder-collapse:collapse;\n\tborder:1px solid darkgray;\n\twhite-space:pre-wrap;\n\twidth: 100%;\n\tmargin-bottom: 60px;\n\tbackground-image: none;\n}\ntable.diff tbody {\n\tfont-family:Courier, monospace\n}\ntable.diff tbody th {\n\tfont-family:verdana,arial,'Bitstream Vera Sans',helvetica,sans-serif;\n\tbackground:#EED;\n\tfont-size:11px;\n\tfont-weight:normal;\n\tborder:1px solid #BBC;\n\tcolor:#886;\n\tpadding:.3em .5em .1em 2em;\n\ttext-align:right;\n\tvertical-align:top\n}\ntable.diff thead {\n\tborder-bottom:1px solid #BBC;\n\tbackground:#EFEFEF;\n\tfont-family:Verdana;\n\theight: 36px;\n    line-height: 36px;\n}\ntable.diff thead th.texttitle {\n\ttext-align:center\n}\ntable.diff tbody td {\n\tpadding:0px .4em;\n\tpadding-top:.4em;\n\tvertical-align:top;\n}\ntable.diff .empty {\n\tbackground-color:#DDD;\n}\ntable.diff .equal {\n\tbackground-color: rgba(255,255,255,0.96);\n    color: #20a0ff;\n}\ntable.diff .replace {\n\tbackground-color:#FD8\n}\ntable.diff .delete {\n\tbackground-color:#E99;\n}\ntable.diff .delete:before {\n\tcontent:\"-\";\n}\ntable.diff .skip {\n\tbackground-color:#EFEFEF;\n\tborder:1px solid #AAA;\n\tborder-right:1px solid #BBC;\n}\ntable.diff .insert {\n\tbackground-color:#9E9\n}\ntable.diff .insert:before {\n\tcontent:\"+\";\n}\ntable.diff th.author {\n\ttext-align:right;\n\tborder-top:1px solid #BBC;\n\tbackground:#EFEFEF\n}", ""]);

// exports


/***/ }),
/* 5 */
/***/ (function(module, exports) {


/**
 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
 * embed the css on the page. This breaks all relative urls because now they are relative to a
 * bundle instead of the current page.
 *
 * One solution is to only use full urls, but that may be impossible.
 *
 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
 *
 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
 *
 */

module.exports = function (css) {
  // get current location
  var location = typeof window !== "undefined" && window.location;

  if (!location) {
    throw new Error("fixUrls requires window.location");
  }

	// blank or null?
	if (!css || typeof css !== "string") {
	  return css;
  }

  var baseUrl = location.protocol + "//" + location.host;
  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");

	// convert each url(...)
	/*
	This regular expression is just a way to recursively match brackets within
	a string.

	 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
	   (  = Start a capturing group
	     (?:  = Start a non-capturing group
	         [^)(]  = Match anything that isn't a parentheses
	         |  = OR
	         \(  = Match a start parentheses
	             (?:  = Start another non-capturing groups
	                 [^)(]+  = Match anything that isn't a parentheses
	                 |  = OR
	                 \(  = Match a start parentheses
	                     [^)(]*  = Match anything that isn't a parentheses
	                 \)  = Match a end parentheses
	             )  = End Group
              *\) = Match anything and then a close parens
          )  = Close non-capturing group
          *  = Match anything
       )  = Close capturing group
	 \)  = Match a close parens

	 /gi  = Get all matches, not the first.  Be case insensitive.
	 */
	var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
		// strip quotes (if they exist)
		var unquotedOrigUrl = origUrl
			.trim()
			.replace(/^"(.*)"$/, function(o, $1){ return $1; })
			.replace(/^'(.*)'$/, function(o, $1){ return $1; });

		// already a full url? no change
		if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
		  return fullMatch;
		}

		// convert the url to a full url
		var newUrl;

		if (unquotedOrigUrl.indexOf("//") === 0) {
		  	//TODO: should we add protocol?
			newUrl = unquotedOrigUrl;
		} else if (unquotedOrigUrl.indexOf("/") === 0) {
			// path should be relative to the base url
			newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
		} else {
			// path should be relative to current directory
			newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
		}

		// send back the fixed url(...)
		return "url(" + JSON.stringify(newUrl) + ")";
	});

	// send back the fixed css
	return fixedCss;
};


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(7);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(1)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!./style.css", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!./style.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(0)(undefined);
// imports


// module
exports.push([module.i, "html {\n  height: 100%;\n}\n\nbody {\n  font-size: 12px;\n  font-family: Sans-Serif;\n  height: 100%;\n  min-width: 1200px;\n  padding-left: 100px;\n  padding-right: 100px;\n  background-image: -webkit-radial-gradient(circle, #3c3b52 0%, #252233 80%);\n  background-image: radial-gradient(circle, #3c3b52 0%, #252233 80%);\n}\nh2 {\n    margin: 0.5em 0 0.1em;\n    text-align: center;\n}\nh2.title{\n    height: 48px;\n    line-height: 48px;\n    font-size: 32px;\n    margin-bottom: 20px;\n    color: #FFF;\n}\n.subtitle {\n    color: #FFF;\n    text-align: right;\n}\n.top {\n    text-align: center;\n}\n.textInput {\n    display: block;\n    width: 49%;\n    float: left;\n}\ntextarea {\n    width:100%;\n    height:300px;\n}\nlabel:hover {\n    text-decoration: underline;\n    cursor: pointer;\n}\n.spacer {\n    margin-left: 10px;\n}\n.viewType {\n    font-size: 16px;\n    clear: both;\n    text-align: center;\n    padding: 1em;\n}\n#diffoutput {\n    width: 100%;\n}\n::-webkit-scrollbar{\n  width: 3px;\n  height: 10px;\n}\n::-webkit-scrollbar-track-piece{\n  -webkit-border-radius: 3px;\n}\n::-webkit-scrollbar-thumb:vertical{\n  height: 5px;\n  -webkit-border-radius: 3px;\n  background-color: #666;\n}\n::-webkit-scrollbar-thumb:horizontal{\n  width: 5px;\n  -webkit-border-radius: 3px;\n  background-color: #666;\n}\n\n\n.file {\n    position: relative;\n    display: inline-block;\n    background: #D0EEFF;\n    border: 1px solid #99D3F5;\n    border-radius: 4px;\n    padding: 4px 12px;\n    overflow: hidden;\n    color: #1E88C7;\n    text-decoration: none;\n    text-indent: 0;\n    line-height: 20px;\n}\n.file input {\n    position: absolute;\n    font-size: 100px;\n    right: 0;\n    top: 0;\n    opacity: 0;\n}\n.file:hover{\n    background: #AADFFD;\n    border-color: #78C3F3;\n    color: #004974;\n    text-decoration: none;\n}\n/* #btn {\n    position: relative;\n    display: inline-block;\n    background: #D0EEFF;\n    border: 1px solid #99D3F5;\n    border-radius: 4px;\n    padding: 4px 12px;\n    overflow: hidden;\n    color: #1E88C7;\n    line-height: 20px;\n} */\n.live {\n  overflow: hidden;\n}\n.live > li {\n  list-style: none;\n  position: relative;\n  padding: 0 0 0 2em;\n  margin: 0 0 .5em 10px;\n  -webkit-transition: .12s;\n          transition: .12s;\n}\n.live > li::before {\n  position: absolute;\n  content: '\\2022';\n  font-family: Arial;\n  color: #FFF;\n  top: 0;\n  left: 0;\n  text-align: center;\n  font-size: 2em;\n  opacity: .5;\n  line-height: .75;\n  -webkit-transition: .5s;\n          transition: .5s;\n}\n.live > li:hover {\n  color: #FFF;\n}\n.live > li:hover::before {\n  -webkit-transform: scale(2);\n      -ms-transform: scale(2);\n          transform: scale(2);\n  opacity: 1;\n  text-shadow: 0 0 4px;\n  -webkit-transition: .1s;\n          transition: .1s;\n}\n.live.type2 > li::before {\n  content: '';\n  width: 10px;\n  height: 10px;\n  background: #FFF;\n  border-radius: 3px;\n  line-height: 0;\n  top: .27em;\n  left: 5px;\n}\n.live.type2 > li:hover::before {\n  -webkit-transform: none;\n      -ms-transform: none;\n          transform: none;\n  border-radius: 5px;\n  width: 25px;\n  left: -10px;\n  background: #BA5353;\n}\n\n.live.numbers {\n  counter-reset: xxx 0;\n}\n.live.numbers > li::before {\n  content: counter(xxx,decimal) \".\";\n  counter-increment: xxx 1;\n  font-family: 'Roboto Condensed';\n  font-size: 1em;\n  opacity: .5;\n  line-height: 1.4;\n  -webkit-transition: .5s;\n          transition: .5s;\n}\n.live.numbers > li:hover:before {\n  opacity: 1;\n  left: -10px;\n  -webkit-transform: none;\n      -ms-transform: none;\n          transform: none;\n  text-shadow: none;\n  -webkit-transition: .12s;\n          transition: .12s;\n}\n.btns {\n    display: flex;\n    justify-content: space-around;\n    padding-top: 20px;\n    padding-bottom: 20px;\n}\nol, ul {\n  width: 90%;\n  display: inline-block;\n  text-align: left;\n  vertical-align: top;\n  background: rgba(0, 0, 0, 0.2);\n  color: rgba(255, 255, 255, 0.5);\n  border-radius: 5px;\n  padding: 1.5em;\n  margin: 2%;\n  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);\n}\n#Lists1, #Lists2 {\n    display: inline-block;\n    width: 50%;\n    float: left;\n    font: 1.33em 'Roboto Condensed', arial;\n    font-weight: 400;\n    position: relative;\n    box-sizing:border-box;\n    -moz-box-sizing:border-box; /* Firefox */\n    -webkit-box-sizing:border-box; /* Safari */\n}\n.group:before,\n.group:after {\n    content: \" \"; /* 1 */\n    display: table; /* 2 */\n}\n\n.group:after {\n    clear: both;\n}\n\n/**\n * For IE 6/7 only\n * Include this rule to trigger hasLayout and contain floats.\n */\n.group {\n    *zoom: 1;\n}", ""]);

// exports


/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/***
This is part of jsdifflib v1.0. <http://snowtide.com/jsdifflib>

Copyright (c) 2007, Snowtide Informatics Systems, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

	* Redistributions of source code must retain the above copyright notice, this
		list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright notice,
		this list of conditions and the following disclaimer in the documentation
		and/or other materials provided with the distribution.
	* Neither the name of the Snowtide Informatics Systems nor the names of its
		contributors may be used to endorse or promote products derived from this
		software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.
***/
/* Author: Chas Emerick <cemerick@snowtide.com> */
var __whitespace = {" ":true, "\t":true, "\n":true, "\f":true, "\r":true};

const difflib = {
	defaultJunkFunction: function (c) {
		return __whitespace.hasOwnProperty(c);
	},

	stripLinebreaks: function (str) { return str.replace(/^[\n\r]*|[\n\r]*$/g, ""); },

	stringAsLines: function (str) {
		// 文件为空时，返回空数组
		if (str === void 0 || str.length === 0) {
			return []
		}
		var lfpos = str.indexOf("\n");
		var crpos = str.indexOf("\r");
		var linebreak = ((lfpos > -1 && crpos > -1) || crpos < 0) ? "\n" : "\r";

		var lines = str.split(linebreak);
		for (var i = 0; i < lines.length; i++) {
			lines[i] = difflib.stripLinebreaks(lines[i]);
		}

		return lines;
	},

	// iteration-based reduce implementation
	__reduce: function (func, list, initial) {
		if (initial != null) {
			var value = initial;
			var idx = 0;
		} else if (list) {
			var value = list[0];
			var idx = 1;
		} else {
			return null;
		}

		for (; idx < list.length; idx++) {
			value = func(value, list[idx]);
		}

		return value;
	},

	// comparison function for sorting lists of numeric tuples
	__ntuplecomp: function (a, b) {
		var mlen = Math.max(a.length, b.length);
		for (var i = 0; i < mlen; i++) {
			if (a[i] < b[i]) return -1;
			if (a[i] > b[i]) return 1;
		}

		return a.length == b.length ? 0 : (a.length < b.length ? -1 : 1);
	},

	__calculate_ratio: function (matches, length) {
		return length ? 2.0 * matches / length : 1.0;
	},

	// returns a function that returns true if a key passed to the returned function
	// is in the dict (js object) provided to this function; replaces being able to
	// carry around dict.has_key in python...
	__isindict: function (dict) {
		return function (key) { return dict.hasOwnProperty(key); };
	},

	// replacement for python's dict.get function -- need easy default values
	__dictget: function (dict, key, defaultValue) {
		return dict.hasOwnProperty(key) ? dict[key] : defaultValue;
	},

	SequenceMatcher: function (a, b, isjunk) {
		this.set_seqs = function (a, b) {
			this.set_seq1(a);
			this.set_seq2(b);
		}

		this.set_seq1 = function (a) {
			if (a == this.a) return;
			this.a = a;
			this.matching_blocks = this.opcodes = null;
		}

		this.set_seq2 = function (b) {
			if (b == this.b) return;
			this.b = b;
			this.matching_blocks = this.opcodes = this.fullbcount = null;
			this.__chain_b();
		}

		this.__chain_b = function () {
			var b = this.b;
			var n = b.length;
			var b2j = this.b2j = {};
			var populardict = {};
			for (var i = 0; i < b.length; i++) {
				var elt = b[i];
				if (b2j.hasOwnProperty(elt)) {
					var indices = b2j[elt];
					if (n >= 200 && indices.length * 100 > n) {
						populardict[elt] = 1;
						delete b2j[elt];
					} else {
						indices.push(i);
					}
				} else {
					b2j[elt] = [i];
				}
			}

			for (var elt in populardict) {
				if (populardict.hasOwnProperty(elt)) {
					delete b2j[elt];
				}
			}

			var isjunk = this.isjunk;
			var junkdict = {};
			if (isjunk) {
				for (var elt in populardict) {
					if (populardict.hasOwnProperty(elt) && isjunk(elt)) {
						junkdict[elt] = 1;
						delete populardict[elt];
					}
				}
				for (var elt in b2j) {
					if (b2j.hasOwnProperty(elt) && isjunk(elt)) {
						junkdict[elt] = 1;
						delete b2j[elt];
					}
				}
			}

			this.isbjunk = difflib.__isindict(junkdict);
			this.isbpopular = difflib.__isindict(populardict);
		}

		this.find_longest_match = function (alo, ahi, blo, bhi) {
			var a = this.a;
			var b = this.b;
			var b2j = this.b2j;
			var isbjunk = this.isbjunk;
			var besti = alo;
			var bestj = blo;
			var bestsize = 0;
			var j = null;
			var k;

			var j2len = {};
			var nothing = [];
			for (var i = alo; i < ahi; i++) {
				var newj2len = {};
				var jdict = difflib.__dictget(b2j, a[i], nothing);
				for (var jkey in jdict) {
					if (jdict.hasOwnProperty(jkey)) {
						j = jdict[jkey];
						if (j < blo) continue;
						if (j >= bhi) break;
						newj2len[j] = k = difflib.__dictget(j2len, j - 1, 0) + 1;
						if (k > bestsize) {
							besti = i - k + 1;
							bestj = j - k + 1;
							bestsize = k;
						}
					}
				}
				j2len = newj2len;
			}

			while (besti > alo && bestj > blo && !isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
				besti--;
				bestj--;
				bestsize++;
			}

			while (besti + bestsize < ahi && bestj + bestsize < bhi &&
					!isbjunk(b[bestj + bestsize]) &&
					a[besti + bestsize] == b[bestj + bestsize]) {
				bestsize++;
			}

			while (besti > alo && bestj > blo && isbjunk(b[bestj - 1]) && a[besti - 1] == b[bestj - 1]) {
				besti--;
				bestj--;
				bestsize++;
			}

			while (besti + bestsize < ahi && bestj + bestsize < bhi && isbjunk(b[bestj + bestsize]) &&
					a[besti + bestsize] == b[bestj + bestsize]) {
				bestsize++;
			}

			return [besti, bestj, bestsize];
		}

		this.get_matching_blocks = function () {
			if (this.matching_blocks != null) return this.matching_blocks;
			var la = this.a.length;
			var lb = this.b.length;

			var queue = [[0, la, 0, lb]];
			var matching_blocks = [];
			var alo, ahi, blo, bhi, qi, i, j, k, x;
			while (queue.length) {
				qi = queue.pop();
				alo = qi[0];
				ahi = qi[1];
				blo = qi[2];
				bhi = qi[3];
				x = this.find_longest_match(alo, ahi, blo, bhi);
				i = x[0];
				j = x[1];
				k = x[2];

				if (k) {
					matching_blocks.push(x);
					if (alo < i && blo < j)
						queue.push([alo, i, blo, j]);
					if (i+k < ahi && j+k < bhi)
						queue.push([i + k, ahi, j + k, bhi]);
				}
			}

			matching_blocks.sort(difflib.__ntuplecomp);

			var i1 = 0, j1 = 0, k1 = 0, block = 0;
			var i2, j2, k2;
			var non_adjacent = [];
			for (var idx in matching_blocks) {
				if (matching_blocks.hasOwnProperty(idx)) {
					block = matching_blocks[idx];
					i2 = block[0];
					j2 = block[1];
					k2 = block[2];
					if (i1 + k1 == i2 && j1 + k1 == j2) {
						k1 += k2;
					} else {
						if (k1) non_adjacent.push([i1, j1, k1]);
						i1 = i2;
						j1 = j2;
						k1 = k2;
					}
				}
			}

			if (k1) non_adjacent.push([i1, j1, k1]);

			non_adjacent.push([la, lb, 0]);
			this.matching_blocks = non_adjacent;
			return this.matching_blocks;
		}

		this.get_opcodes = function () {
			if (this.opcodes != null) return this.opcodes;
			var i = 0;
			var j = 0;
			var answer = [];
			this.opcodes = answer;
			var block, ai, bj, size, tag;
			var blocks = this.get_matching_blocks();
			for (var idx in blocks) {
				if (blocks.hasOwnProperty(idx)) {
					block = blocks[idx];
					ai = block[0];
					bj = block[1];
					size = block[2];
					tag = '';
					if (i < ai && j < bj) {
						tag = 'replace';
					} else if (i < ai) {
						tag = 'delete';
					} else if (j < bj) {
						tag = 'insert';
					}
					if (tag) answer.push([tag, i, ai, j, bj]);
					i = ai + size;
					j = bj + size;

					if (size) answer.push(['equal', ai, i, bj, j]);
				}
			}

			return answer;
		}

		// this is a generator function in the python lib, which of course is not supported in javascript
		// the reimplementation builds up the grouped opcodes into a list in their entirety and returns that.
		this.get_grouped_opcodes = function (n) {
			if (!n) n = 3;
			var codes = this.get_opcodes();
			if (!codes) codes = [["equal", 0, 1, 0, 1]];
			var code, tag, i1, i2, j1, j2;
			if (codes[0][0] == 'equal') {
				code = codes[0];
				tag = code[0];
				i1 = code[1];
				i2 = code[2];
				j1 = code[3];
				j2 = code[4];
				codes[0] = [tag, Math.max(i1, i2 - n), i2, Math.max(j1, j2 - n), j2];
			}
			if (codes[codes.length - 1][0] == 'equal') {
				code = codes[codes.length - 1];
				tag = code[0];
				i1 = code[1];
				i2 = code[2];
				j1 = code[3];
				j2 = code[4];
				codes[codes.length - 1] = [tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)];
			}

			var nn = n + n;
			var group = [];
			var groups = [];
			for (var idx in codes) {
				if (codes.hasOwnProperty(idx)) {
					code = codes[idx];
					tag = code[0];
					i1 = code[1];
					i2 = code[2];
					j1 = code[3];
					j2 = code[4];
					if (tag == 'equal' && i2 - i1 > nn) {
						group.push([tag, i1, Math.min(i2, i1 + n), j1, Math.min(j2, j1 + n)]);
						groups.push(group);
						group = [];
						i1 = Math.max(i1, i2-n);
						j1 = Math.max(j1, j2-n);
					}

					group.push([tag, i1, i2, j1, j2]);
				}
			}

			if (group && !(group.length == 1 && group[0][0] == 'equal')) groups.push(group)

			return groups;
		}

		this.ratio = function () {
			matches = difflib.__reduce(
							function (sum, triple) { return sum + triple[triple.length - 1]; },
							this.get_matching_blocks(), 0);
			return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
		}

		this.quick_ratio = function () {
			var fullbcount, elt;
			if (this.fullbcount == null) {
				this.fullbcount = fullbcount = {};
				for (var i = 0; i < this.b.length; i++) {
					elt = this.b[i];
					fullbcount[elt] = difflib.__dictget(fullbcount, elt, 0) + 1;
				}
			}
			fullbcount = this.fullbcount;

			var avail = {};
			var availhas = difflib.__isindict(avail);
			var matches = numb = 0;
			for (var i = 0; i < this.a.length; i++) {
				elt = this.a[i];
				if (availhas(elt)) {
					numb = avail[elt];
				} else {
					numb = difflib.__dictget(fullbcount, elt, 0);
				}
				avail[elt] = numb - 1;
				if (numb > 0) matches++;
			}

			return difflib.__calculate_ratio(matches, this.a.length + this.b.length);
		}

		this.real_quick_ratio = function () {
			var la = this.a.length;
			var lb = this.b.length;
			return _calculate_ratio(Math.min(la, lb), la + lb);
		}

		this.isjunk = isjunk ? isjunk : difflib.defaultJunkFunction;
		this.a = this.b = null;
		this.set_seqs(a, b);
	}
};
/* harmony export (immutable) */ __webpack_exports__["a"] = difflib;




/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/*
This is part of jsdifflib v1.0. <http://github.com/cemerick/jsdifflib>

Copyright 2007 - 2011 Chas Emerick <cemerick@snowtide.com>. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY Chas Emerick ``AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Chas Emerick OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Chas Emerick.
*/
const diffview = {
	/**
	 * Builds and returns a visual diff view.  The single parameter, `params', should contain
	 * the following values:
	 *
	 * - baseTextLines: the array of strings that was used as the base text input to SequenceMatcher
	 * - newTextLines: the array of strings that was used as the new text input to SequenceMatcher
	 * - opcodes: the array of arrays returned by SequenceMatcher.get_opcodes()
	 * - baseTextName: the title to be displayed above the base text listing in the diff view; defaults
	 *	   to "Base Text"
	 * - newTextName: the title to be displayed above the new text listing in the diff view; defaults
	 *	   to "New Text"
	 * - contextSize: the number of lines of context to show around differences; by default, all lines
	 *	   are shown
	 * - viewType: if 0, a side-by-side diff view is generated (default); if 1, an inline diff view is
	 *	   generated
	 */
	buildView: function (params) {
		var baseTextLines = params.baseTextLines;
		var newTextLines = params.newTextLines;
		var opcodes = params.opcodes;
		var baseTextName = params.baseTextName === void 0 ? "Base Text" : params.baseTextName;
		var newTextName = params.newTextName ===void 0 ? "New Text" : params.newTextName;
		var contextSize = params.contextSize;
		var inline = (params.viewType == 0 || params.viewType == 1) ? params.viewType : 0;

		if (baseTextLines == null)
			throw "Cannot build diff view; baseTextLines is not defined.";
		if (newTextLines == null)
			throw "Cannot build diff view; newTextLines is not defined.";
		if (!opcodes)
			throw "Canno build diff view; opcodes is not defined.";

		function celt (name, clazz) {
			var e = document.createElement(name);
			e.className = clazz;
			return e;
		}

		function telt (name, text) {
			var e = document.createElement(name);
			e.appendChild(document.createTextNode(text));
			return e;
		}

		function ctelt (name, clazz, text) {
			var e = document.createElement(name);
			e.className = clazz;
			e.appendChild(document.createTextNode(text));
			return e;
		}

		var tdata = document.createElement("thead");
		var node = document.createElement("tr");
		tdata.appendChild(node);
		if (inline) {
			// node.appendChild(document.createElement("th"));
			// node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", '行号'));
			node.appendChild(ctelt("th", "texttitle", '行号'));
			node.appendChild(ctelt("th", "texttitle", baseTextName + " vs. " + newTextName));
		} else {
			// node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", '行号'));
			node.appendChild(ctelt("th", "texttitle", baseTextName));
			// node.appendChild(document.createElement("th"));
			node.appendChild(ctelt("th", "texttitle", '行号'));
			node.appendChild(ctelt("th", "texttitle", newTextName));
		}
		tdata = [tdata];

		var rows = [];
		var node2;

		/**
		 * Adds two cells to the given row; if the given row corresponds to a real
		 * line number (based on the line index tidx and the endpoint of the
		 * range in question tend), then the cells will contain the line number
		 * and the line of text from textLines at position tidx (with the class of
		 * the second cell set to the name of the change represented), and tidx + 1 will
		 * be returned.	 Otherwise, tidx is returned, and two empty cells are added
		 * to the given row.
		 */
		function addCells (row, tidx, tend, textLines, change) {
			if (tidx < tend) {
				row.appendChild(telt("th", (tidx + 1).toString()));
				row.appendChild(ctelt("td", change, textLines[tidx].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")));
				return tidx + 1;
			} else {
				row.appendChild(document.createElement("th"));
				row.appendChild(celt("td", "empty"));
				return tidx;
			}
		}

		function addCellsInline (row, tidx, tidx2, textLines, change) {
			row.appendChild(telt("th", tidx == null ? "" : (tidx + 1).toString()));
			row.appendChild(telt("th", tidx2 == null ? "" : (tidx2 + 1).toString()));
			row.appendChild(ctelt("td", change, textLines[tidx != null ? tidx : tidx2].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")));
		}

		for (var idx = 0; idx < opcodes.length; idx++) {
			let code = opcodes[idx];
			let change = code[0];
			var b = code[1];
			var be = code[2];
			var n = code[3];
			var ne = code[4];
			var rowcnt = Math.max(be - b, ne - n);
			var toprows = [];
			var botrows = [];
			for (var i = 0; i < rowcnt; i++) {
				// jump ahead if we've alredy provided leading context or if this is the first range
				if (contextSize && opcodes.length > 1 && ((idx > 0 && i == contextSize) || (idx == 0 && i == 0)) && change=="equal") {
					var jump = rowcnt - ((idx == 0 ? 1 : 2) * contextSize);
					if (jump > 1) {
						toprows.push(node = document.createElement("tr"));

						b += jump;
						n += jump;
						i += jump - 1;
						node.appendChild(telt("th", "..."));
						if (!inline) node.appendChild(ctelt("td", "skip", ""));
						node.appendChild(telt("th", "..."));
						node.appendChild(ctelt("td", "skip", ""));

						// skip last lines if they're all equal
						if (idx + 1 == opcodes.length) {
							break;
						} else {
							continue;
						}
					}
				}

				toprows.push(node = document.createElement("tr"));
				if (inline) {
					if (change == "insert") {
						addCellsInline(node, null, n++, newTextLines, change);
					} else if (change == "replace") {
						botrows.push(node2 = document.createElement("tr"));
						if (b < be) addCellsInline(node, b++, null, baseTextLines, "delete");
						if (n < ne) addCellsInline(node2, null, n++, newTextLines, "insert");
					} else if (change == "delete") {
						addCellsInline(node, b++, null, baseTextLines, change);
					} else {
						// equal
						addCellsInline(node, b++, n++, baseTextLines, change);
					}
				} else {
					b = addCells(node, b, be, baseTextLines, change);
					n = addCells(node, n, ne, newTextLines, change);
				}
			}

			for (var i = 0; i < toprows.length; i++) rows.push(toprows[i]);
			for (var i = 0; i < botrows.length; i++) rows.push(botrows[i]);
		}

		// rows.push(node = ctelt("th", "author", "diff view generated by "));
		// node.setAttribute("colspan", inline ? 3 : 4);
		// node.appendChild(node2 = telt("a", "jsdifflib"));
		// node2.setAttribute("href", "http://github.com/cemerick/jsdifflib");

		tdata.push(node = document.createElement("tbody"));
		for (var idx in rows) rows.hasOwnProperty(idx) && node.appendChild(rows[idx]);

		node = celt("table", "diff" + (inline ? " inlinediff" : ""));
		for (var idx in tdata) tdata.hasOwnProperty(idx) && node.appendChild(tdata[idx]);
		return node;
	}
};
/* harmony export (immutable) */ __webpack_exports__["a"] = diffview;




/***/ })
/******/ ]);