import { useEffect, useState } from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import commissionAdminApi from '../../features/admin/api/commissionAdminApi';
import ConfirmModal from '../../components/ui/ConfirmModal';
import '../../assets/css/AdminDashboard.css';

const AdminCommissionConfig = () => {
    const [config, setConfig] = useState(null);
    const [commissionInput, setCommissionInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
    const [filters, setFilters] = useState({ search: '' });
    const [transactions, setTransactions] = useState([]);
    const [loadingTransactions, setLoadingTransactions] = useState(true);
    const [transactionPagination, setTransactionPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
    const [transactionFilters, setTransactionFilters] = useState({ search: '', paymentMethod: '' });

    const [toast, setToast] = useState({ type: '', message: '' });
    const [activeTab, setActiveTab] = useState('transactions');
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        nextValue: null
    });

    const showToast = (type, message) => {
        setToast({ type, message });
        if (message) {
            setTimeout(() => setToast({ type: '', message: '' }), 3000);
        }
    };

    const fetchConfig = async () => {
        try {
            setLoadingConfig(true);
            const res = await commissionAdminApi.getConfig();
            setConfig(res.data);
            setCommissionInput(String(res.data?.commissionPercent ?? ''));
        } catch (error) {
            console.error('[ADMIN COMMISSION] fetch config error', error);
            showToast('error', error.response?.data?.message || 'Failed to load commission config');
        } finally {
            setLoadingConfig(false);
        }
    };

    const fetchHistory = async (nextPage = 1, nextFilters = filters) => {
        try {
            setLoadingHistory(true);
            const params = {
                page: nextPage,
                limit: pagination.limit,
                search: nextFilters.search?.trim() || undefined
            };

            const res = await commissionAdminApi.getHistory(params);
            setHistory(Array.isArray(res.data) ? res.data : []);
            setPagination(res.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
        } catch (error) {
            console.error('[ADMIN COMMISSION] fetch history error', error);
            showToast('error', error.response?.data?.message || 'Failed to load commission history');
        } finally {
            setLoadingHistory(false);
        }
    };

    const fetchTransactions = async (nextPage = 1, nextFilters = transactionFilters) => {
        try {
            setLoadingTransactions(true);
            const params = {
                page: nextPage,
                limit: transactionPagination.limit,
                search: nextFilters.search?.trim() || undefined,
                paymentMethod: nextFilters.paymentMethod || undefined
            };

            const res = await commissionAdminApi.getTransactions(params);
            setTransactions(Array.isArray(res.data) ? res.data : []);
            setTransactionPagination(res.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
        } catch (error) {
            console.error('[ADMIN COMMISSION] fetch transaction error', error);
            showToast('error', error.response?.data?.message || 'Failed to load commission transactions');
        } finally {
            setLoadingTransactions(false);
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchHistory();
        fetchTransactions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const performUpdateCommission = async (value) => {
        try {
            setSaving(true);
            await commissionAdminApi.updateConfig(value);
            showToast('success', 'Commission updated successfully');
            await Promise.all([fetchConfig(), fetchHistory(1), fetchTransactions(1)]);
        } catch (error) {
            console.error('[ADMIN COMMISSION] update error', error);
            showToast('error', error.response?.data?.message || 'Failed to update commission');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateCommission = async (e) => {
        e.preventDefault();
        const value = Number(commissionInput);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            showToast('error', 'Commission percent must be between 0 and 100');
            return;
        }

        const currentValue = Number(config?.commissionPercent);
        const isSameValue = Number.isFinite(currentValue) && value === currentValue;

        setConfirmState({
            isOpen: true,
            title: 'Confirm Commission Update',
            message: isSameValue
                ? `Commission is still ${currentValue}%. Do you still want to submit this update?`
                : `Update commission from ${Number.isFinite(currentValue) ? `${currentValue}%` : '-'} to ${value}%?`,
            nextValue: value
        });
    };

    const handleConfirmUpdate = async () => {
        const value = confirmState.nextValue;
        setConfirmState({ isOpen: false, title: '', message: '', nextValue: null });
        if (!Number.isFinite(Number(value))) return;
        await performUpdateCommission(Number(value));
    };

    const handleCancelConfirm = () => {
        setConfirmState({ isOpen: false, title: '', message: '', nextValue: null });
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        await fetchHistory(1, filters);
    };

    const handleChangePage = async (nextPage) => {
        if (nextPage < 1 || nextPage > pagination.pages) return;
        await fetchHistory(nextPage, filters);
    };

    const handleTransactionSearch = async (e) => {
        e.preventDefault();
        await fetchTransactions(1, transactionFilters);
    };

    const handleTransactionPage = async (nextPage) => {
        if (nextPage < 1 || nextPage > transactionPagination.pages) return;
        await fetchTransactions(nextPage, transactionFilters);
    };

    const formatPercent = (value) => {
        if (typeof value !== 'number') return '-';
        return `${value}%`;
    };

    const formatDate = (date) => (date ? new Date(date).toLocaleString('vi-VN') : '-');
    const formatDateTimeShort = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        const time = d.toLocaleTimeString('vi-VN', { hour12: false });
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        return `${time} ${day}/${month}/${year}`;
    };
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN').format(Number(value || 0));

    return (
        <div className="admin-wrapper">
            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={handleConfirmUpdate}
                onCancel={handleCancelConfirm}
                confirmText="Yes"
                cancelText="No"
                type="primary"
            />

            {toast.message && (
                <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
                    {toast.message}
                </div>
            )}

            <AdminHeader />

            <main className="admin-content-full">
                <div className="page-inner">
                    <div className="dynamic-header">
                        <h1>Commission Config</h1>
                        <p>Configure commission rate and review commission history (append-only)</p>
                    </div>

                    <div className="section-divider" />

                    <div className="admin-users-center" style={{ display: 'grid', gap: 16 }}>
                        <div className="admin-card users-card">
                            <div className="table-header-row">
                                <h3>Current Commission</h3>
                            </div>

                            {loadingConfig ? (
                                <div className="loading-state">Loading commission config...</div>
                            ) : (
                                <form onSubmit={handleUpdateCommission} style={{ display: 'grid', gap: 12 }}>
                                    <div style={{ color: '#6b7280', fontSize: 14 }}>
                                        Current value: <strong>{formatPercent(config?.commissionPercent)}</strong>
                                    </div>
                                    <div style={{ color: '#6b7280', fontSize: 13 }}>
                                        Last updated by: {config?.updatedBy?.fullName || 'N/A'} - {formatDate(config?.updatedAt)}
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={commissionInput}
                                            onChange={(e) => setCommissionInput(e.target.value)}
                                            placeholder="Enter commission %"
                                            style={{
                                                width: 220,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid #e5e7eb'
                                            }}
                                        />
                                        <button type="submit" className="btn-approve-teal" disabled={saving}>
                                            {saving ? 'Updating...' : 'Update Commission'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>

                        <div className="admin-card users-card">
                            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    className={activeTab === 'transactions' ? 'btn-approve-teal' : 'btn-outline'}
                                    onClick={() => setActiveTab('transactions')}
                                >
                                    Commission Transactions
                                </button>
                                <button
                                    type="button"
                                    className={activeTab === 'history' ? 'btn-approve-teal' : 'btn-outline'}
                                    onClick={() => setActiveTab('history')}
                                >
                                    Commission History
                                </button>
                            </div>

                            {activeTab === 'history' && (
                                <>
                                    <div className="table-header-row">
                                        <h3>Commission History</h3>
                                        <span className="count-badge">{pagination.total} records</span>
                                    </div>

                                    <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={filters.search}
                                            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                                            placeholder="Search by value, updater name, email"
                                            style={{
                                                flex: '1 1 260px',
                                                minWidth: 220,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                border: '1px solid #e5e7eb'
                                            }}
                                        />
                                        <button type="submit" className="btn-outline">Search</button>
                                    </form>

                                    {loadingHistory ? (
                                        <div className="loading-state">Loading history...</div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="admin-table users-table">
                                                <thead>
                                                    <tr>
                                                        <th>Old Value</th>
                                                        <th>New Value</th>
                                                        <th>Updated By</th>
                                                        <th style={{ textAlign: 'center' }}>Updated At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {history.length === 0 ? (
                                                        <tr>
                                                            <td colSpan="4" className="no-data-cell">No history records found.</td>
                                                        </tr>
                                                    ) : (
                                                        history.map((item) => (
                                                            <tr key={item._id}>
                                                                <td>{formatPercent(item.oldValue)}</td>
                                                                <td style={{ fontWeight: 600 }}>{formatPercent(item.newValue)}</td>
                                                                <td>
                                                                    {item.updatedBy?.fullName || '-'}
                                                                    <br />
                                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>{item.updatedBy?.email || '-'}</span>
                                                                </td>
                                                                <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                    {formatDateTimeShort(item.updatedAt)}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    <div className="pagination-row">
                                        <button
                                            type="button"
                                            className="btn-outline"
                                            disabled={pagination.page <= 1}
                                            onClick={() => handleChangePage(pagination.page - 1)}
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-info">Page {pagination.page} / {pagination.pages}</span>
                                        <button
                                            type="button"
                                            className="btn-outline"
                                            disabled={pagination.page >= pagination.pages}
                                            onClick={() => handleChangePage(pagination.page + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </>
                            )}

                            {activeTab === 'transactions' && (
                                <>
                            <div className="table-header-row">
                                <h3>Commission Transactions</h3>
                                <span className="count-badge">{transactionPagination.total} records</span>
                            </div>

                            <form onSubmit={handleTransactionSearch} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    value={transactionFilters.search}
                                    onChange={(e) => setTransactionFilters((prev) => ({ ...prev, search: e.target.value }))}
                                    placeholder="Search salon, service, customer"
                                    style={{
                                        flex: '1 1 260px',
                                        minWidth: 220,
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #e5e7eb'
                                    }}
                                />
                                <select
                                    value={transactionFilters.paymentMethod}
                                    onChange={(e) => setTransactionFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                                    style={{
                                        minWidth: 140,
                                        padding: '8px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #e5e7eb'
                                    }}
                                >
                                    <option value="">All methods</option>
                                    <option value="CASH">CASH</option>
                                    <option value="WALLET">WALLET</option>
                                    <option value="VNPAY">VNPAY</option>
                                </select>
                                <button type="submit" className="btn-outline">Search</button>
                            </form>

                            {loadingTransactions ? (
                                <div className="loading-state">Loading commission transactions...</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="admin-table users-table">
                                        <thead>
                                            <tr>
                                                <th>Salon / Service</th>
                                                <th>Customer</th>
                                                <th>Gross</th>
                                                <th>Commission</th>
                                                <th>System</th>
                                                <th>Salon</th>
                                                <th>Method</th>
                                                <th>Paid At</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="8" className="no-data-cell">No commission transactions found.</td>
                                                </tr>
                                            ) : (
                                                transactions.map((item) => (
                                                    <tr key={item._id}>
                                                        <td>
                                                            {item.salonName}
                                                            <br />
                                                            <span style={{ fontSize: 12, color: '#6b7280' }}>{item.serviceName}</span>
                                                        </td>
                                                        <td>
                                                            {item.customerName}
                                                            <br />
                                                            <span style={{ fontSize: 12, color: '#6b7280' }}>{item.customerEmail}</span>
                                                        </td>
                                                        <td>{formatCurrency(item.grossAmount)} VND</td>
                                                        <td>{formatPercent(item.commissionPercent)}</td>
                                                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.systemAmount)} VND</td>
                                                        <td>{formatCurrency(item.salonAmount)} VND</td>
                                                        <td>{item.paymentMethod}</td>
                                                        <td>{formatDate(item.paidAt)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="pagination-row">
                                <button
                                    type="button"
                                    className="btn-outline"
                                    disabled={transactionPagination.page <= 1}
                                    onClick={() => handleTransactionPage(transactionPagination.page - 1)}
                                >
                                    Previous
                                </button>
                                <span className="pagination-info">Page {transactionPagination.page} / {transactionPagination.pages}</span>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    disabled={transactionPagination.page >= transactionPagination.pages}
                                    onClick={() => handleTransactionPage(transactionPagination.page + 1)}
                                >
                                    Next
                                </button>
                            </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminCommissionConfig;
