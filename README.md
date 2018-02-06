ChaZD
=====

ChaZD 查字典，简洁易用的英汉字典扩展程序，支持划词哦:)
翻译结果和发音朗读由**有道翻译**驱动。

获取
-----------
+ [Chrome 网上应用商店](https://chrome.google.com/webstore/detail/chazd/nkiipedegbhbjmajlhpegcpcaacbfggp) 
+ [crx 文件](https://github.com/ververcpp/ChaZD/blob/master/ChaZD.crx?raw=true)  

**注**：安装扩展后，第一次使用请刷新要查词的页面，划词功能才会生效；  
**注2**：非中文版Chrome浏览器的用户，如出现插件弹出窗口字体无法正常显示的情况，麻烦请更改浏览器的最小字号为12px
（具体步骤: settings-->show advanced settings-->Web content中的Customize fonts... -->Minimum font     size将最小字号改为12px）。

主要功能
-----------
+ 支持在线英汉互译
+ 提供英文单词和语句的英音、美音真人发音朗读
+ 支持网页内英文划词翻译
+ 可通过快捷键（Ctrl+Shift+F）快速启动词典扩展，也可以自定义快捷键
+ 可设置开启与关闭划词功能，并可选择划词结果的显示位置

截图
-----------
![Screenshoot 1](/screenshoot/screenshoot1.jpg)  
---
![Screenshoot 2](/screenshoot/screenshoot4.png)

修改代码及部署
-----------

确保你已经安装了[Node.js](http://nodejs.org/)以及[grunt-cli](https://github.com/gruntjs/grunt-cli),

下载代码并部署
```shell
git clone https://github.com/ververcpp/ChaZD.git
cd ChaZD && npm install   #安装部署依赖的包
grunt                     #部署代码
```

进入Chrome的扩展程序设置页面，点击“加载正在开发的扩展程序”，选择ChaZD目录

可以使用`grunt watch`实时更新修改的js、css文件并部署，
每次修改代码之后直接在浏览器的扩展程序设置页面重新加载ChaZD即可

-----------
部分功能设计借鉴于[TransIt](https://github.com/GDG-Xian/crx-transit)

源码完全开放，欢迎Star、Fork、提交BUG，并提出您宝贵的意见与建议。


### 二次修改
鉴于有道翻译API进行了升级，因此更换了原有api并加入了MD5验证，同时根据自己喜好对部分样式进行了更换。
这个插件真的挺棒！
感谢原作者

ps. grunt进行自动化构建的时候，要求命名必须驼峰式且花括号不能省略，改了配置文件也没有升序=-=略有点坑
同时发现 在一个js文件中引用另一个js文件好像不太容易做到，试了几种办法都没有实现，最后还是将另一个文件中的代码复制过来了=-=
