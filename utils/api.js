const axios = require("axios");
const getExp = require("./coins").getExplorer;

const proxies = [
    a => a,
    url => `https://zaif-status.herokuapp.com/proxy/${encodeURIComponent(url)}`,
    url => `https://letsminezny.orz.hm/proxy1/${Buffer.from(url).toString('hex')}`,
    url => `https://letsminezny.orz.hm/proxy2/${Buffer.from(url).toString('hex')}`
];

function create(endPoints) {
    let endPointOffset = 0;
    let proxyOffset = 0;
    const request = async function request(path) {
        while (true) {
            try {
                const data = (await axios({
                    url: proxies[proxyOffset](`${endPoints[endPointOffset]}${path}`),
                    timeout: 1000,
                    responseType: 'json'
                })).data;
                if (typeof data !== "object" || data.error) {
                    throw data;
                }
                return data;
            } catch (e) {
                request.next();
            }
        }
    }
    request.rawBlock = async hex => {
        while (true) {
            const rawBlock = (await request(`/rawblock/${hex}`)).rawblock;
            if (!rawBlock) {
                request.next();
                continue;
            }
            return rawBlock;
        }
    };
    request.blockInfo = async hex => await request(`/block/${hex}`);
    request.txInfo = async hex => await request(`/tx/${hex}`);
    request.root = async () => (await request(`/block-index/100`)).blockHash;
    request.next = () => {
        proxyOffset = (proxyOffset + 1) % proxies.length;
        if (proxyOffset == 0) {
            endPointOffset = (endPointOffset + 1) % endPoints.length;
        }
    }

    return request;
}
create.MONA = create(getExp("MONA"));
create.BTC = create(getExp("BTC"));
create.default = create(getExp());

module.exports = create;