# Supabase 邮件模板说明 (Supabase OTP Email Template)

当前系统默认已经可用 **Magic Link**（魔法链接）登录，用户点击邮件中的链接即可完成身份验证并自动跳回应用。

为了提升用户体验并提供 **OTP (One-Time Password) 验证码回退方案** (Fallback)，我们在登录界面增加了输入 6 位数字验证码的功能。

## 启用 OTP 的前置要求
若希望用户能看到 6 位验证码，必须在 Supabase 的邮件模板中包含 `{{ .Token }}`。

1. 进入 [Supabase Dashboard](https://supabase.com/dashboard)
2. 导航到 **Authentication > Emails**
3. 在 **Magic Link** 或 **Confirm signup** 模板的邮件正文中，添加如下提示语：

```html
<p>If you have trouble clicking the link, you can enter the following 6-digit code in the app:</p>
<h2>{{ .Token }}</h2>
```

## 注意事项
- 如果你使用的是 Supabase 免费版且模板不可编辑，或者你尚未修改模板，前端的 **Verify Code** 输入框和按钮依然会显示并保留。
- 这不会影响功能，但用户可能在收到的邮件里**看不到** 6 位验证码，只能继续使用点击 Magic Link 的方式登录。
- 如果配置或修改模板不方便，后续你可以考虑切换到 Password Login，或继续只保留 Magic Link 登录方式。
