@echo off
echo === 构建网站 ===
call npx astro build
if %errorlevel% neq 0 (
    echo 构建失败！
    pause
    exit /b 1
)
echo === 复制到根目录 ===
xcopy /E /Y dist\* .\
echo === 上传 ===
git add index.html posts/ avatar.jpg .gitignore 2>nul
git add -A
git commit -m "更新网站"
git push
echo === 完成！===
pause
