const i3wm = require('i3wm');
const CDP = require('chrome-remote-interface');
const { spawn } = require('child_process');


(async () => {
    CDP.List(async (err, targets) => {
        if (!err) {
            const selectedTab = await selectChromeTab(targets);
            if (selectedTab) {
                await activateTab(selectedTab);
                await activateWindowByTabName(selectedTab.title);
            }
            // let keys = targets.map(t => { id });
          //   let key = {
          //       description: '',
          //       devtoolsFrontendUrl: '/devtools/inspector.html?ws=127.0.0.1:9222/devtools/page/45CE8EC2BED157D603EF
          //   ABC69C2F7326',
          //       faviconUrl: 'https://github.githubassets.com/favicon.ico',
          //       id: '45CE8EC2BED157D603EFABC69C2F7326',
          //       title: 'i3 switches focus to wrong window when moving windows to other screen · Issue #3848 · i3/i3
          //   ',
          //       type: 'page',
          //       url: 'https://github.com/i3/i3/issues/3848',
          //       webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/45CE8EC2BED157D603EFABC69C2F7326'
          // }
            // console.log(targets);
        }
    });
    // let windows = await getI3Windows();
    // console.log(windows);
    // windows.forEach(win => console.log(win.name));
})();

async function selectChromeTab(tabs) {
    const promise = new Promise((resolve, reject) => {
        let dmenuProc = spawn('dmenu', ['-i','-fn','Consolas', '-l', '56', '-nb', 'black', '-p', '']);
        dmenuProc.stdin.write(tabs.map(tab => tab.title).join('\n'));
        dmenuProc.stdin.end();
        let selection = null;
        dmenuProc.stdout.on('data', data => selection = data.toString().replace('\n', ''));
        dmenuProc.stdout.on('end', () => resolve(tabs.filter(t => t.title === selection)[0]));
    });
    return promise;
}

async function activateTab(tab) {
    const promise = new Promise(resolve => {
        CDP.Activate({id: tab.id}, (err) => {
            if (!err) {
                resolve();
            }
        });
    });
    return promise;
}

async function activateWindowByTabName(tabName) {
    return new Promise(async resolve => {
        const wins = await getI3Windows();
        const matchingWindows = wins.filter(win => ~win.name.toLowerCase().indexOf(tabName.toLowerCase()));
        // console.log(matchingWindows);
        //i3-msg '[con_id="94134132824656"] focus'
        if (matchingWindows && matchingWindows.length > 0) {
            const client = await i3wm.Client.connect();
            await client.command(`[con_id="${matchingWindows[0].id}"] focus`);
            i3wm.Client.disconnect(client);
        }
        resolve();
    });
}

async function getI3Windows() {
    const client = await i3wm.Client.connect();
    const tree = await client.message('get_tree');
    i3wm.Client.disconnect(client);
    return await parseI3Graph(tree);
}

async function parseI3Graph(node) {
    var nodes = [];
    if (node.nodes && node.nodes.length > 0 && (node.type == 'con' || node.type == 'workspace' || node.type == 'root' || node.type =='output')) {
        // node.nodes.forEach(n => nodes = nodes.concat(await parseI3Graph(n)));
        // nodes.concat(node.nodes.map());
        node.nodes.forEach(async n => {
            subnodes = await parseI3Graph(n);
            subnodes.forEach(sn => nodes.push(sn));
        });
    }
    if (node.type === 'con' && node.window && node.name) nodes.push(node);
    return nodes;
}
