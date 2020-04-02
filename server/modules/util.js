const {exec} = require('child_process');
module.exports = {
    execShellCmd(cmd,opts) {
        return new Promise((resolve, reject) => {
            exec(cmd, opts, (error, stdout, stderr) => {
                if (error) {
                    reject(error)
                }else{
                    resolve({stdout,stderr});
                }
            });
        });
    }
}