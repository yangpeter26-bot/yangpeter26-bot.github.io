---
title: "LSPosed 模块开发笔记 —— 以解锁 Guitar 吉他调音 VIP 为例"
date: "2026-07-21"
tags: ["Android", "LSPosed", "逆向"]
excerpt: "从零开始学习 LSPosed 模块开发：Jadx 逆向分析、Xposed Hook 原理、VIP 解锁实战，附完整代码。"
---

# LSPosed 模块开发笔记 —— 以解锁 Guitar吉他调音 VIP 为例

## 一、项目背景

目标 App：Guitar吉他调音（`com.rr.guitartuner`，版本 1.4.5）  
目的：解锁 VIP 高级功能  
工具：LSPosed 框架 + Android Studio + Jadx

---

## 二、环境准备

### 2.1 安装 Android Studio

下载地址：https://developer.android.com/studio

安装到 E 盘，SDK 也建议放 E 盘（省 C 盘空间）：
- Android Studio 路径：`E:\Android\Android Studio`
- SDK 路径：`E:\Android\sdk`

### 2.2 配置国内镜像（重要！）

国内下载 Gradle 和 Maven 依赖很慢，必须配镜像。

#### Gradle 下载镜像

修改 `gradle/wrapper/gradle-wrapper.properties`：
```properties
distributionUrl=https\://mirrors.cloud.tencent.com/gradle/gradle-8.9-bin.zip
```

#### Maven 仓库镜像

修改 `settings.gradle`：
```groovy
pluginManagement {
    repositories {
        maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/central' }
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        maven { url 'https://maven.aliyun.com/repository/google' }
        maven { url 'https://maven.aliyun.com/repository/central' }
        maven { url 'https://maven.aliyun.com/repository/public' }
        maven { url 'https://api.xposed.info/' }
        google()
        mavenCentral()
    }
}
```

### 2.3 安装 Jadx（反编译工具）

下载地址：https://github.com/skylot/releases

选择 `jadx-gui-1.5.6-with-jre-win.zip`（自带 Java 运行环境，不用额外装）。

解压到 `E:\tools\jadx\`，双击 `bin\jadx-gui.bat` 即可使用。

---

## 三、分析目标 APK

### 3.1 获取包名

用 Android SDK 自带的 aapt 工具：

```bash
# 复制 APK 到无中文路径
cp "Guitar吉他调音_1.4.5.apk" guitar.apk

# 获取包名
aapt dump badging guitar.apk | head -1
```

输出：
```
package: name='com.rr.guitartuner' versionCode='10' versionName='1.4.5'
```

**包名：`com.rr.guitartuner`**

### 3.2 提取 DEX 文件

APK 本质是 ZIP 压缩包，里面包含编译后的代码（classes.dex）：

```bash
mkdir apk_extracted
unzip guitar.apk classes*.dex -d apk_extracted/
```

这个 APK 有两个 DEX 文件：
- `classes.dex`（8MB）
- `classes2.dex`（6MB）

### 3.3 搜索 VIP 相关字符串

用 `strings` 命令在 DEX 文件中搜索关键词：

```bash
strings classes2.dex | grep -i -E "vip|premium|isVip|getVip|setVip"
```

找到的关键信息：
```
isVip                    → 检查是否是 VIP
getVipLevel              → 获取 VIP 等级
getVipValue              → 获取 VIP 值
getFreeVip               → 获取免费 VIP 状态
setVipLevel              → 设置 VIP 等级
setVipValue              → 设置 VIP 值
setFreeVip               → 设置免费 VIP 状态
VipInfo(vipLevel=        → VIP 信息类
```

### 3.4 找到 VIP 相关类

```bash
strings classes2.dex | grep "Lcom/rr/guitartuner/vip/"
```

找到的类：
```
Lcom/rr/guitartuner/vip/O000OoO;          → VIP 管理类（混淆后）
Lcom/rr/guitartuner/vip/OO;               → 另一个 VIP 类
Lcom/rr/guitartuner/vip/OoooOO0;          → 另一个 VIP 类
Lcom/rr/guitartuner/vip/VipActivity;      → VIP 购买页面
Lcom/rr/guitartuner/vip/FirstVipActivity; → 首次 VIP 页面
Lcom/rr/guitartuner/vip/UserActivity;     → 用户页面
Lcom/rr/guitartuner/vip/LoginActivity;    → 登录页面
```

### 3.5 用 dexdump 分析方法调用

Android SDK 自带的 dexdump 工具可以查看 DEX 文件的详细结构：

```bash
# 找到 VIP 检查方法
dexdump -d classes2.dex | grep "O000OoO;.O00:"
```

输出显示这个方法被调用了 **31 次**，说明它是核心 VIP 检查方法。

进一步分析方法签名：
```
Lcom/rr/guitartuner/vip/O000OoO;.O00:(Landroid/content/Context;)Z
```

解读：
- 类名：`com.rr.guitartuner.vip.O000OoO`
- 方法名：`O00`
- 参数：`android.content.Context`
- 返回值：`Z`（boolean，true=VIP，false=非VIP）

### 3.6 分析调用逻辑

```bash
dexdump -d classes2.dex | grep -A20 "O000OoO;.O00:" | head -30
```

关键代码逻辑：
```
invoke-static {v0}, Lcom/rr/guitartuner/vip/O000OoO;.O00:(Context;)Z
move-result v0
if-eqz v0, 0015        ← 如果返回 false，跳转到非 VIP 逻辑
→ 进入 HomeActivity    ← 如果返回 true，进入主页面
```

翻译成人话：
```
if (O000OoO.O00(context) == true) {
    进入主页面（VIP 用户）
} else {
    跳转到 VIP 购买页面（非 VIP 用户）
}
```

### 3.7 找到服务器响应类

```bash
strings classes2.dex | grep -E "vipLevel|vipValue|freeVip" | grep "Lcom/rr"
```

找到两个服务器响应类：
```
Lcom/rr/cloud_tencent/response/LoginResponse;   → 登录响应，包含 vipLevel
Lcom/rr/cloud_tencent/response/CommitResponse;  → 提交响应，包含 vipValue 和 freeVip
```

这些类从服务器获取 VIP 信息，App 用这些信息判断用户是否是 VIP。

---

## 四、创建 LSPosed 模块项目

### 4.1 项目结构

```
GuitarVipHook/
├── build.gradle                    ← 根构建文件
├── settings.gradle                 ← 项目设置（含镜像配置）
├── gradle/wrapper/
│   ├── gradle-wrapper.jar          ← Gradle 包装器
│   └── gradle-wrapper.properties   ← Gradle 版本配置
├── gradlew                         ← Linux 构建脚本
├── gradlew.bat                     ← Windows 构建脚本
└── app/
    ├── build.gradle                ← 应用构建文件
    └── src/main/
        ├── AndroidManifest.xml     ← 清单文件
        ├── assets/
        │   └── xposed_init         ← LSPosed 入口配置
        ├── java/com/hook/guitarvip/
        │   └── VipHook.java        ← 核心 Hook 代码
        └── res/values/
            ├── arrays.xml          ← 作用域配置
            └── strings.xml         ← 字符串资源
```

### 4.2 根 build.gradle

```groovy
plugins {
    id 'com.android.application' version '8.7.0' apply false
}
```

### 4.3 app/build.gradle

```groovy
plugins {
    id 'com.android.application'
}

android {
    namespace 'com.hook.guitarvip'
    compileSdk 35

    defaultConfig {
        applicationId "com.hook.guitarvip"
        minSdk 28
        targetSdk 35
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }

    // 自定义 APK 文件名
    applicationVariants.configureEach { variant ->
        variant.outputs.configureEach {
            outputFileName = "吉他Pro解锁_v${versionName}.apk"
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    // Xposed API，compileOnly 表示只在编译时需要，不会打包进 APK
    compileOnly 'de.robv.android.xposed:api:82'
    compileOnly 'de.robv.android.xposed:api:82:sources'
}
```

**关键点：**
- `compileOnly` 而不是 `implementation`，因为 Xposed API 在设备上由 LSPosed 框架提供
- `minSdk 28`：最低支持 Android 9
- `compileSdk 35`：使用最新的 Android 15 SDK 编译

### 4.4 AndroidManifest.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:label="@string/app_name"
        android:theme="@android:style/Theme.Material.Light">

        <!-- LSPosed 模块元数据 -->
        <meta-data
            android:name="xposedmodule"
            android:value="true" />
        <meta-data
            android:name="xposeddescription"
            android:value="解锁 Guitar吉他调音 VIP 功能" />
        <meta-data
            android:name="xposedminversion"
            android:value="93" />
        <meta-data
            android:name="xposedscope"
            android:resource="@array/xposed_scope" />

    </application>

</manifest>
```

**关键点：**
- `xposedmodule = true`：告诉 LSPosed 这是一个 Xposed 模块
- `xposedminversion = 93`：最低需要 LSPosed 版本 93
- `xposedscope`：指定模块的作用域（对哪些 App 生效）

### 4.5 xposed_init

文件路径：`app/src/main/assets/xposed_init`

```
com.hook.guitarvip.VipHook
```

这个文件告诉 LSPosed 框架，模块启动时要加载哪个类。LSPosed 会读取这个文件，找到对应的类，调用它的 `handleLoadPackage` 方法。

### 4.6 arrays.xml（作用域配置）

文件路径：`app/src/main/res/values/arrays.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string-array name="xposed_scope">
        <item>com.rr.guitartuner</item>
    </string-array>
</resources>
```

这里指定了模块只对 `com.rr.guitartuner`（Guitar吉他调音）生效。

### 4.7 strings.xml

文件路径：`app/src/main/res/values/strings.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">吉他Pro解锁</string>
</resources>
```

这是模块在手机上显示的名字。

---

## 五、核心 Hook 代码

### 5.1 VipHook.java 完整代码

```java
package com.hook.guitarvip;

import de.robv.android.xposed.IXposedHookLoadPackage;
import de.robv.android.xposed.XC_MethodReplacement;
import de.robv.android.xposed.XposedBridge;
import de.robv.android.xposed.XposedHelpers;
import de.robv.android.xposed.callbacks.XC_LoadPackage;

public class VipHook implements IXposedHookLoadPackage {

    // 目标 App 的包名
    private static final String TARGET_PACKAGE = "com.rr.guitartuner";
    // VIP 管理类（混淆后的类名）
    private static final String VIP_CLASS = "com.rr.guitartuner.vip.O000OoO";

    @Override
    public void handleLoadPackage(XC_LoadPackage.LoadPackageParam lpparam) throws Throwable {
        // 只对目标 App 生效，避免影响其他 App
        if (!lpparam.packageName.equals(TARGET_PACKAGE)) {
            return;
        }

        XposedBridge.log("GuitarVipHook: 已加载，开始 hook VIP 模块");

        try {
            // 获取 VIP 管理类
            Class<?> vipClass = XposedHelpers.findClass(VIP_CLASS, lpparam.classLoader);

            // ========== 1. Hook isVip 检查 ==========
            // 原方法：O000OoO.O00(Context) → 返回 boolean
            // 改为：始终返回 true
            XposedHelpers.findAndHookMethod(vipClass, "O00",
                android.content.Context.class,
                new XC_MethodReplacement() {
                    @Override
                    protected Object replaceHookedMethod(MethodHookParam param) {
                        return true;  // 强制返回 true = VIP
                    }
                }
            );

            // ========== 2. Hook getVipLevel ==========
            // 原方法：OOO0(Context) → 返回 String
            // 改为：返回 "99"（最高等级）
            XposedHelpers.findAndHookMethod(vipClass, "OOO0",
                android.content.Context.class,
                new XC_MethodReplacement() {
                    @Override
                    protected Object replaceHookedMethod(MethodHookParam param) {
                        return "99";
                    }
                }
            );

            // ========== 3. Hook setVipLevel ==========
            // 防止 App 覆盖我们设置的 VIP 等级
            try {
                XposedHelpers.findAndHookMethod(vipClass, "OO",
                    android.content.Context.class, int.class,
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return null;  // 什么都不做
                        }
                    }
                );
            } catch (Throwable ignored) {}

            // ========== 4. Hook setVipValue ==========
            try {
                XposedHelpers.findAndHookMethod(vipClass, "oo0O0Oo0OOoo0",
                    android.content.Context.class, int.class,
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return null;
                        }
                    }
                );
            } catch (Throwable ignored) {}

            // ========== 5. Hook setFreeVip ==========
            try {
                XposedHelpers.findAndHookMethod(vipClass, "O0ooO",
                    android.content.Context.class, String.class,
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return null;
                        }
                    }
                );
            } catch (Throwable ignored) {}

            // ========== 6. Hook 其他 setter ==========
            try {
                XposedHelpers.findAndHookMethod(vipClass, "OoooOO0",
                    android.content.Context.class, String.class,
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return null;
                        }
                    }
                );
            } catch (Throwable ignored) {}

            // ========== 7. Hook LoginResponse.vipLevel ==========
            // 服务器返回的登录响应中的 VIP 等级
            try {
                XposedHelpers.findAndHookMethod(
                    "com.rr.cloud_tencent.response.LoginResponse",
                    lpparam.classLoader, "getVipLevel",
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return 99;
                        }
                    }
                );
            } catch (Throwable ignored) {}

            // ========== 8. Hook CommitResponse ==========
            // 服务器返回的提交响应中的 VIP 信息
            try {
                Class<?> commitResp = XposedHelpers.findClass(
                    "com.rr.cloud_tencent.response.CommitResponse", lpparam.classLoader);

                XposedHelpers.findAndHookMethod(commitResp, "getVipValue",
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return 99;
                        }
                    }
                );

                XposedHelpers.findAndHookMethod(commitResp, "getFreeVip",
                    new XC_MethodReplacement() {
                        @Override
                        protected Object replaceHookedMethod(MethodHookParam param) {
                            return 99;
                        }
                    }
                );
            } catch (Throwable ignored) {}

            XposedBridge.log("GuitarVipHook: 全部 Hook 完成！VIP 已解锁");

        } catch (Throwable t) {
            XposedBridge.log("GuitarVipHook: Hook 失败 - " + t.getMessage());
            t.printStackTrace();
        }
    }
}
```

### 5.2 代码逐行解释

#### 类定义
```java
public class VipHook implements IXposedHookLoadPackage {
```
- 实现 `IXposedHookLoadPackage` 接口
- LSPosed 框架会在每个 App 启动时调用 `handleLoadPackage` 方法

#### 包名过滤
```java
if (!lpparam.packageName.equals(TARGET_PACKAGE)) {
    return;
}
```
- `lpparam.packageName` 是当前启动的 App 的包名
- 如果不是目标 App，直接返回，不做任何 hook
- 这样可以避免影响其他 App

#### 获取类引用
```java
Class<?> vipClass = XposedHelpers.findClass(VIP_CLASS, lpparam.classLoader);
```
- `findClass` 通过类名字符串获取 Class 对象
- `lpparam.classLoader` 是目标 App 的类加载器
- 因为类名是混淆后的（O000OoO），所以用字符串

#### Hook 方法
```java
XposedHelpers.findAndHookMethod(
    vipClass,                    // 要 hook 的类
    "O00",                       // 要 hook 的方法名
    android.content.Context.class,  // 方法参数类型
    new XC_MethodReplacement() {    // 替换方法的实现
        @Override
        protected Object replaceHookedMethod(MethodHookParam param) {
            return true;  // 返回值
        }
    }
);
```

**参数说明：**
- 第 1 个参数：Class 对象或类名字符串
- 第 2 个参数：方法名
- 第 3 个参数起：方法的参数类型（按顺序）
- 最后一个参数：Hook 回调

**XC_MethodReplacement 的作用：**
- 完全替换原方法的实现
- 原方法的代码不会被执行
- `replaceHookedMethod` 的返回值就是原方法的返回值

#### try-catch 包裹
```java
try {
    XposedHelpers.findAndHookMethod(...);
} catch (Throwable ignored) {}
```
- 用 try-catch 包裹每个 hook
- 如果某个方法不存在（比如 App 版本不同），不会导致整个模块崩溃
- `ignored` 表示我们故意忽略这个异常

### 5.3 Xposed API 核心概念

| 概念 | 说明 |
|------|------|
| `IXposedHookLoadPackage` | 接口，实现它来 hook App |
| `handleLoadPackage` | 每个 App 启动时被调用 |
| `XposedHelpers.findAndHookMethod` | 查找并 hook 指定方法 |
| `XC_MethodReplacement` | 完全替换原方法 |
| `XC_MethodHook` | 在原方法前后插入代码（不替换） |
| `XposedBridge.log` | 写日志，可在 LSPosed 中查看 |
| `lpparam.classLoader` | 目标 App 的类加载器 |
| `lpparam.packageName` | 当前 App 的包名 |

---

## 六、编译与安装

### 6.1 设置 JAVA_HOME

Android Gradle Plugin 需要 Java 11+，在终端设置：

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
```

### 6.2 编译

```powershell
cd E:\Android\GuitarVipHook
.\gradlew.bat build
```

编译成功后，APK 在：
```
E:\Android\GuitarVipHook\app\build\outputs\apk\debug\吉他Pro解锁_v1.0.apk
```

### 6.3 安装到手机

1. 把 APK 传到手机（数据线、LocalSend、微信等）
2. 在手机上点击安装（允许未知来源）
3. 打开 LSPosed → 模块 → 找到「吉他Pro解锁」
4. 勾选「Guitar吉他调音」作为作用域
5. 强制关闭目标 App，重新打开

### 6.4 验证 Hook 是否生效

打开 LSPosed → 日志，搜索 `GuitarVipHook`，如果看到：
```
GuitarVipHook: 已加载，开始 hook VIP 模块
GuitarVipHook: 全部 Hook 完成！VIP 已解锁
```

说明 hook 成功。

---

## 七、常见问题

### Q1: 编译报错 "Could not resolve com.android.tools.build:gradle"
**原因：** Java 版本太低  
**解决：** 设置 JAVA_HOME 为 Java 17
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
```

### Q2: 编译报错 "resource mipmap/ic_launcher not found"
**原因：** 缺少启动图标  
**解决：** 在 AndroidManifest.xml 中删除 `android:icon` 属性，或添加图标文件

### Q3: Gradle 下载超时
**原因：** 国内访问 Gradle 服务器慢  
**解决：** 修改 `gradle-wrapper.properties` 使用腾讯镜像

### Q4: Maven 依赖下载失败
**原因：** 国内访问 Maven Central/Google 慢  
**解决：** 在 `settings.gradle` 中配置阿里云镜像

### Q5: Hook 不生效
**可能原因：**
1. 作用域没有勾选目标 App
2. 没有重启目标 App
3. 类名或方法名不正确（App 版本不同）
4. LSPosed 没有激活

**排查方法：**
1. 查看 LSPosed 日志
2. 用 Jadx 重新分析 APK，确认类名和方法名

### Q6: App 闪退
**原因：** hook 了错误的方法，导致 App 崩溃  
**解决：** 
1. 减少 hook 的方法数量，只保留核心的 `O00` hook
2. 确保每个 hook 都有 try-catch 包裹

---

## 八、LSPosed 模块开发通用流程

1. **获取包名**：`aapt dump badging xxx.apk`
2. **反编译 APK**：用 Jadx 打开 APK，搜索关键词
3. **找到目标方法**：搜索 `isVip`、`isPremium`、`checkLicense` 等
4. **分析方法签名**：类名、方法名、参数类型、返回值
5. **创建 Android 项目**：配置 LSPosed 依赖
6. **编写 Hook 代码**：用 `findAndHookMethod` hook 目标方法
7. **编译安装**：`gradlew build`，安装 APK
8. **配置作用域**：在 LSPosed 中勾选目标 App
9. **测试验证**：重启 App，查看效果

---

## 九、Xposed API 速查表

### Hook 方法
```java
// 替换方法（不执行原方法）
XposedHelpers.findAndHookMethod(clazz, methodName, paramTypes..., new XC_MethodReplacement() {
    @Override
    protected Object replaceHookedMethod(MethodHookParam param) {
        return newValue;  // 返回新值
    }
});

// 在方法执行前插入代码
XposedHelpers.findAndHookMethod(clazz, methodName, paramTypes..., new XC_MethodHook() {
    @Override
    protected void beforeHookedMethod(MethodHookParam param) {
        // 修改参数
        param.args[0] = newValue;
    }
});

// 在方法执行后插入代码
XposedHelpers.findAndHookMethod(clazz, methodName, paramTypes..., new XC_MethodHook() {
    @Override
    protected void afterHookedMethod(MethodHookParam param) {
        // 修改返回值
        param.setResult(newValue);
    }
});
```

### Hook 构造方法
```java
XposedHelpers.findAndHookConstructor(clazz, paramTypes..., new XC_MethodHook() {
    @Override
    protected void afterHookedMethod(MethodHookParam param) {
        // 构造方法执行后的操作
    }
});
```

### 获取/修改字段
```java
// 获取字段值
Object value = XposedHelpers.getObjectField(obj, "fieldName");
int intValue = XposedHelpers.getIntField(obj, "fieldName");
boolean boolValue = XposedHelpers.getBooleanField(obj, "fieldName");

// 修改字段值
XposedHelpers.setObjectField(obj, "fieldName", newValue);
XposedHelpers.setIntField(obj, "fieldName", 99);
XposedHelpers.setBooleanField(obj, "fieldName", true);
```

### 调用原方法
```java
// 在 beforeHookedMethod 中调用原方法
Object result = XposedBridge.invokeOriginalMethod(param.method, param.thisObject, param.args);
```

---

## 十、参考资料

- LSPosed 官方文档：https://lsposed.org/
- Xposed API 文档：https://api.xposed.info/
- Jadx GitHub：https://github.com/skylot/jadx
- Android Studio 下载：https://developer.android.com/studio
- 阿里云 Maven 镜像：https://maven.aliyun.com/
- 腾讯云 Gradle 镜像：https://mirrors.cloud.tencent.com/gradle/

---

*笔记完成时间：2026年7月21日*  
*项目路径：E:\Android\GuitarVipHook*  
*APK 路径：E:\Android\GuitarVipHook\app\build\outputs\apk\debug\吉他Pro解锁_v1.0.apk*
