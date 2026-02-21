@echo off
REM Download ChromeDriver for Windows (version must match your Chrome browser)
REM You may need to update the version below to match your installed Chrome
set CHROME_DRIVER_VERSION=124.0.6367.91
curl -Lo chromedriver_win32.zip https://chromedriver.storage.googleapis.com/%CHROME_DRIVER_VERSION%/chromedriver_win32.zip
powershell -Command "Expand-Archive chromedriver_win32.zip -DestinationPath ."
del chromedriver_win32.zip
