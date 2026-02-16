import crypto from 'crypto';

const encodeValue = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');

const buildQueryString = (params) => {
    return Object.keys(params)
        .map((key) => `${encodeValue(key)}=${encodeValue(params[key])}`)
        .join('&');
};

const sortObject = (obj) => {
    const sorted = {};
    Object.keys(obj).sort().forEach((key) => {
        sorted[key] = obj[key];
    });
    return sorted;
};

export const buildVnpayUrl = ({ amount, txnRef, orderInfo, ipAddr, returnUrl }) => {
    const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    const vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!vnp_TmnCode || !vnp_HashSecret) {
        throw new Error('Missing VNPay configuration.');
    }

    const date = new Date();
    const createDate = date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);

    let vnp_Params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode,
        vnp_Locale: 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Amount: amount * 100,
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: ipAddr,
        vnp_CreateDate: createDate
    };

    vnp_Params = sortObject(vnp_Params);
    const signData = buildQueryString(vnp_Params);
    const secureHash = crypto
        .createHmac('sha512', vnp_HashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    vnp_Params.vnp_SecureHash = secureHash;

    const paymentUrl = `${vnp_Url}?${buildQueryString(vnp_Params)}`;
    return paymentUrl;
};

export const verifyVnpayReturn = (query) => {
    const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    if (!vnp_HashSecret) {
        throw new Error('Missing VNPay configuration.');
    }

    const params = { ...query };
    const secureHash = params.vnp_SecureHash;
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const sorted = sortObject(params);
    const signData = buildQueryString(sorted);
    const checkHash = crypto
        .createHmac('sha512', vnp_HashSecret)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');

    return secureHash === checkHash;
};
