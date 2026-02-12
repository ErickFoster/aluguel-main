@echo off
cd /d "%~dp0"

echo ========================================
echo Fazendo push para GitHub Pages
echo ========================================

REM Adicionar arquivos
git add .
if errorlevel 1 (
    echo Erro ao adicionar arquivos
    pause
    exit /b 1
)

REM Fazer commit
git commit -m "Deploy frontend para GitHub Pages"
if errorlevel 1 (
    echo Nenhuma mudança para fazer commit
    pause
    exit /b 0
)

REM Fazer push
git push origin main
if errorlevel 1 (
    echo Erro ao fazer push
    pause
    exit /b 1
)

echo ========================================
echo Deploy realizado com sucesso!
echo Seu site estará disponível em:
echo https://ErickFoster.github.io/aluguel-main
echo ========================================
pause
