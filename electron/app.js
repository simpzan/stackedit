
const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow

let mainWindow

function createWindow() {
    const screenSize = electron.screen.getPrimaryDisplay().workAreaSize
    mainWindow = new BrowserWindow(screenSize)
    mainWindow.loadURL('http://localhost:3000/editor?debug')
    mainWindow.webContents.openDevTools()
    mainWindow.on('closed', function () {
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow()
    }
})

