#几种for循环性能比较
直接说结论：**for(reverse)** > **for** > **forEach** > **for ...of**
> for(reverse)就是从后往前for，这样只需要计算一次数组长度

理论上**for(reverse) > for**是肯定成立的，实际上可能会是相反，其它几个关系不变。

	const count = 100000000; 
	const arr = Array(count);
	console.time('⏳');
	
	for (let i = arr.length; i > 0; i--) {} // for(reverse) :- 85.316ms
	for (let i = 0; i < arr.length; i++) {} // for          :- 82.042ms
	
	arr.forEach(v => v)                     // foreach      :- 1170.712ms
	for (const v of arr) {}                 // for...of     :- 6087.967ms
	
	console.timeEnd('⏳');

性能和代码可读性恰好相反。