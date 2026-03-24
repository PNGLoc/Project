import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import './ReviewModal.css';

const clampRating = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 5;
    return Math.min(5, Math.max(1, Math.round(n)));
};

const StarRating = ({ value, onChange, disabled }) => {
    const [hover, setHover] = useState(0);
    const display = hover || value;

    return (
        <div className={`star-rating ${disabled ? 'disabled' : ''}`} role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => {
                const filled = n <= display;
                return (
                    <button
                        key={n}
                        type="button"
                        className={`star-btn ${filled ? 'filled' : ''}`}
                        onMouseEnter={() => !disabled && setHover(n)}
                        onMouseLeave={() => !disabled && setHover(0)}
                        onClick={() => !disabled && onChange(n)}
                        disabled={disabled}
                        aria-label={`${n} star`}
                        aria-checked={n === value}
                        role="radio"
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
};

const ReviewModal = ({ isOpen, appointment, onClose, onSaved }) => {
    const existingReview = appointment?.review || null;
    const hasExisting = Boolean(existingReview);

    const initial = useMemo(() => ({
        rating: clampRating(existingReview?.rating ?? 5),
        comment: existingReview?.comment ?? ''
    }), [existingReview]);

    const [form, setForm] = useState(initial);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(initial);
        setSubmitting(false);
        setDeleting(false);
    }, [isOpen, initial]);

    if (!isOpen) return null;

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!appointment?._id) return;

        const rating = clampRating(form.rating);
        const comment = String(form.comment || '').trim();

        try {
            setSubmitting(true);
            if (hasExisting) {
                await axiosClient.put(`/api/appointments/${appointment._id}/review`, { rating, comment });
                toast.success('Review updated.');
            } else {
                await axiosClient.post(`/api/appointments/${appointment._id}/review`, { rating, comment });
                toast.success('Review submitted.');
            }
            onSaved?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save review.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!appointment?._id) return;
        try {
            setDeleting(true);
            await axiosClient.delete(`/api/appointments/${appointment._id}/review`);
            toast.success('Review deleted.');
            onSaved?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete review.');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="review-modal-overlay" onClick={onClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                <div className="review-modal-header">
                    <h3>{hasExisting ? 'Update Review' : 'Review Service'}</h3>
                    <button type="button" className="review-modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="review-modal-subtitle">
                    <div className="review-modal-service">{appointment?.serviceSnapshot?.name || 'Service'}</div>
                    <div className="review-modal-salon">{appointment?.salonSnapshot?.name || ''}</div>
                </div>

                <form onSubmit={handleSubmit} className="review-modal-body">
                    <label className="review-field">
                        <span className="review-label">Rating</span>
                        <StarRating
                            value={clampRating(form.rating)}
                            onChange={(rating) => setForm((prev) => ({ ...prev, rating }))}
                            disabled={submitting || deleting}
                        />
                    </label>

                    <label className="review-field">
                        <span className="review-label">Comment (optional)</span>
                        <textarea
                            name="comment"
                            rows={4}
                            value={form.comment}
                            onChange={handleChange}
                            placeholder="Share your experience..."
                            disabled={submitting || deleting}
                        />
                    </label>

                    <div className="review-modal-actions">
                        <button type="button" className="review-btn secondary" onClick={onClose} disabled={submitting || deleting}>
                            Cancel
                        </button>
                        {hasExisting && (
                            <button type="button" className="review-btn danger" onClick={handleDelete} disabled={submitting || deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        )}
                        <button type="submit" className="review-btn primary" disabled={submitting || deleting}>
                            {submitting ? 'Saving...' : (hasExisting ? 'Update' : 'Submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReviewModal;

