# OAuth授权类型
在本部分，我们将介绍2种常见的OAuth授权类型，如果在OAuth方面你还是个新手，那么强烈建议你先看这篇文章再去看OAuth身份验证漏洞。

### 什么是OAuth授权类型（grant type）？
OAuth授予类型决定了OAuth流程中涉及的确切步骤顺序。授予类型还会影响客户端应用程序在每个阶段与OAuth服务进行通信的方式，包括access token本身的发送方式。因此，授权类型通常称为“ OAuth流”。

只有在OAuth服务配置了支持某种授权类型之后，客户端应用程序才能发起对应类型的OAuth流。客户端应用程序在向OAuth服务发起授权请求前指定自己想要使用的授权类型。
有很多种授权类型，它们之间的差异在于复杂程度和安全设计。我们将聚焦于授权码授权和隐式授权这2种目前为止使用最广泛的授权类型。

### OAuth 作用域（scope）
对于任意一种授权类型，客户端还需要指定它需要访问哪些数据以及作何操作。这是通过客户端在向OAuth服务发送请求时携带**`scope`**参数来完成的。

对于基本OAuth，客户端应用程序可以请求访问的**`scope`**对于每个OAuth服务都是独一无二的。由于**`scope`**就是一个随意的文本字符串，它的格式在不同的OAuth服务中差异很大。有些OAuth服务甚至使用完整的URI作为**`scope`**，类似于REST API的远端。例如，当请求对某个用户联系人的读权限的时候，取决于OAuth 服务的实现，**`scope`**可能是下面中的任何一种：

	scope=contacts
	scope=contacts.read
	scope=contact-list-r
	scope=https://oauth-authorization-server.com/auth/scopes/user/contacts.readonly
	
当OAuth用来做认证时，常会使用标准化的OpenID Connect作用域。例如，作用域`openid profile` 将向客户端应用程序授予对用户的预定义基本信息集的读取访问权限，如用户的电子邮件地址，用户名等。稍后我们将详细讨论OpenID Connect。

### 授权码授权类型
授权码授权类型咋一看很复杂，但是一旦你对其中的基础更熟悉之后你会发现它比你想象中简单多了。

简而言之，客户端应用程序和OAuth服务首先使用重定向来交换一系列基于浏览器的HTTP请求，以启动整个流程。然后，用户被询问是否同意对数据访问。如果他们接受，则OAuth服务向客户端应用程序授予“授权码”。然后，客户端应用程序与OAuth服务交换此码以换取“访问令牌（`access token`）”，客户端应用程序可以使用`access token`来进行API调用以获取相关的用户数据。

从**授权码(code)/访问令牌(token)交换**开始进行的所有通信都是通过安全的，预先配置的反向通道在服务器之间发送的，因此对于最终用户是不可见的。当客户端应用程序首次向OAuth服务注册时，就会建立此安全通道。此时，还会生成一个`client_secret`，在发送这些服务器到服务器请求时，客户端应用程序必须使用该`client_secret`对其进行身份验证。

由于最敏感的数据（`access token`和用户数据）不是通过浏览器发送的，因此这种授予类型可以说是最安全的。理想情况下，服务器端应用程序应始终始终使用这种授予类型。

![](https://github.com/DuLinRain/pictures/blob/master/oauth2/oauth2_1.png?raw=true)

#### 1. 授权请求
客户端应用程序向授权服务的`/authorization`（具体的接口名字在不同的授权服务中实现可能不一样）发送授权请求，要求获取预制的用户数据：

	GET /authorization?client_id=12345&redirect_uri=https://client-app.com/callback&response_type=code&scope=openid%20profile&state=ae13d489bd00e3c24 HTTP/1.1
	Host: oauth-authorization-server.com
	
这个请求包含如下几个值得注意的参数，通常是在query中携带：

- **client_id** 必须的参数，是客户端应用程序的唯一标识符。客户端应用程序向OAuth服务注册时会生成此值。
- **redirect_uri** 表示授权服务在向客户端发送授权码时需要重定向的URI，这个值也通常被称为回调URI（`callback` URI）或者回调接口。许多OAuth攻击都通过利用此参数验证中的缺陷完成的。
- **response_type** 决定客户端希望那种响应了诶下，这样就会发起哪种OAuth流。对于授权码授权类型，这个值需要是code。
- **scope** 用于指定客户端应用程序要访问用户数据的哪个子集。请注意，这些可能是OAuth提供程序设置的自定义范围，也可能是OpenID Connect规范定义的标准化范围。稍后我们将详细介绍OpenID Connect。
- **state**。 存储唯一的，不可猜测的值，该值与客户端应用程序上的当前会话相关。 OAuth服务应在响应中返回该值(`state`)以及授权码(`code`)。 该参数用作客户端应用程序CSRF token的一种形式，通过它可以确保对`/callback`接口的请求来自发起OAuth流的同一人。

#### 2. 用户登录和同意
授权服务器收到初始请求后，会将用户重定向到登录页面，在该页面上将提示他们使用OAuth登录其帐户。例如，这通常是他们的社交媒体帐户。

然后他们将会被提供客户端应用想要访问的数据列表。这个列表是由授权请求中的`scope`参数决定的。用户可以选择同意或者不同意这次访问。

#### 3. 授予授权码
如果用户同意了对相关数据的访问，他们的浏览器将会被重定向到授权请求中`redirect_uri`参数中指定的`/callback`接口。这个重定向的GET请求URL中将会包含一个授权码(`code`)参数。取决于授权服务具体的配置，他可能也会将发起授权请求时携带的`state`参数放在URL中发送回去。例如：

	GET /callback?code=a1b2c3d4e5f6g7h8&state=ae13d489bd00e3c24 HTTP/1.1
	Host: client-app.com
	
#### 4. 请求Access token
一旦客户端应用程序收到授权码，它需要用这个授权码换访问令牌（即`code`换`token`）。这是通过在服务端向OAuth服务的`/token`接口发送POST来完成的。从此时开始的所有的通信都是在服务端通道完成的，因此不太容易被攻击者观测和控制。

	POST /token HTTP/1.1
	Host: oauth-authorization-server.com
	…
	client_id=12345&client_secret=SECRET&redirect_uri=https://client-app.com/callback&grant_type=authorization_code&code=a1b2c3d4e5f6g7h8
	
除了`client_id`和授权码，你将看到几个新的参数：

- **client_secret** 客户端应用程序必须通过提交`client_secret` 来证明它自己的身份。这个参数是客户端应用程序在OAuth服务注册时分配的。
- **grant_type** 确保新的终端知道客户端想要使用何种授权类型，在授权码授权类型下，这个值是`authorization_code`。

#### 5. 授予Access token
OAuth服务会校验这个请求，如果一切通过会返回`token`和对应的`scope`:

	{
	  "access_token": "z0y9x8w7v6u5",
	  "token_type": "Bearer",
	  "expires_in": 3600,
	  "scope": "openid profile",
	  …
	}
	
#### 6. API调用
现在，客户端应用程序有了`access token`，所以它最终可以从资源服务器获取用户数据。比如，它将对OAuth服务的`/userinfo`接口进行API调用。**访问令牌（access token）**在**Authorization：Bearer**标头中提交，以证明客户端应用程序有权访问此数据。


	GET /userinfo HTTP/1.1
	Host: oauth-resource-server.com
	Authorization: Bearer z0y9x8w7v6u5
	
#### 7. 资源授权
资源服务器需要验证提交的`token`是有效的并且它属于当前的应用程序。如果是的话，它将把该`token`对应范围内的用户数据返回给客户端：

	{
	  "username":"carlos",
	  "email":"carlos@carlos-montoya.net",
	  …
	}
	
客户端最终可以使用这个数据做它想做的事情。

### 隐式授权类型
隐式授权类型比授权码授权类型更加简单。不像授权码授权类型需要先获取**授权码(code)**再使用**授权码换token**，隐式授权类型是在用户同意之后就立即将`token`返回给客户端应用。

你可能会想，为什么客户端应用不怎么使用隐式授权类型呢？答案非常简单——因为它不怎么安全。当使用隐式授权类型的时候，所有的通信都发生在客户端和授权服务之间，通过浏览器重定向实现。这里面不会有类似于授权码授权类型中的那种客户端应用的服务端与授权服务之间后端——后端的通信。这意味着，敏感的access token和用户数据更暴露，更有可能遭受到潜在的攻击。

![](https://github.com/DuLinRain/pictures/blob/master/oauth2/oauth2_2.png?raw=true)

#### 1. 授权请求
隐式授权类型的流程和授权码授权的初始流程非常像，唯一的差异就是参数`response_type`的值需要是`token`(后者是`code`):

	GET /authorization?client_id=12345&redirect_uri=https://client-app.com/callback&response_type=token&scope=openid%20profile&state=ae13d489bd00e3c24 HTTP/1.1
	Host: oauth-authorization-server.com
	
#### 2. 用户登录和同意
这一步和授权码授权类型完全一致。

#### 3. 授权Access token
如果用户点击了同意，那么从这个时候开始的过程就与授权码模式变的不同了。OAuth服务会将用户浏览器重定向到授权请求中`redirect_uri`指向的地址。然而，除了在URL的`hash`中返回一个授权码，还会带上一个`token`:

	GET /callback#access_token=z0y9x8w7v6u5&token_type=Bearer&expires_in=5000&scope=openid%20profile&state=ae13d489bd00e3c24 HTTP/1.1
	Host: client-app.com
	
由于`access token`是放在URL的`hash`部分，所有并不是直接通过`response`发送发送到客户端端，因此客户端应用需要使用合适的脚本提取出对应的`token`并存储。

#### 4. API call
一旦客户端应用拿到`access token`，那么它就可以向OAuth服务发起API调用。但是，与授权码模式不同的是，这个调用也是发生在客户端浏览器的：

	GET /userinfo HTTP/1.1
	Host: oauth-resource-server.com
	Authorization: Bearer z0y9x8w7v6u5


#### 5. 资源授权
资源服务器需要检验`token`是有效的，并且是属于对应的客户端应用的。如果是的话，会返回对应的用户数据，例如：

	{
	  "username":"carlos",
	  "email":"carlos@carlos-montoya.net"
	}