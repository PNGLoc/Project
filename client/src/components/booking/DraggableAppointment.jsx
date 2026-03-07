import React from 'react';
import { useDrag } from 'react-dnd';

export const ITEM_TYPE_APPOINTMENT = 'APPOINTMENT';

const DraggableAppointment = ({ appointment, isStaff }) => {
    // Determine if draggable
    const canDrag = !isStaff && (appointment.status === 'pending' || appointment.status === 'confirmed');

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: ITEM_TYPE_APPOINTMENT,
        item: { id: appointment.id, durationMinutes: parseDuration(appointment.timeRange) },
        canDrag: () => canDrag,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [appointment, isStaff]);

    return (
        <div
            ref={canDrag ? dragRef : null}
            className={`appointment-card ${appointment.status} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
            style={{
                cursor: canDrag ? 'grab' : (isStaff ? 'default' : 'pointer'),
                opacity: isDragging ? 0.5 : 1
            }}
        >
            <span className="client-name" title={appointment.clientName}>{appointment.clientName}</span>
            <span className="service-name" title={appointment.service}>{appointment.service}</span>
            <div className="apt-meta">
                <span className={`status-badge-inline ${appointment.status}`}>
                    {appointment.status}
                </span>
                <span className="time-range">{appointment.timeRange}</span>
            </div>
            {canDrag && <div className="drag-indicator" title="Drag to reschedule">☰</div>}
        </div>
    );
};

// Helper to parse duration from timeRange "09:00 AM - 10:30 AM" for drop calculation (if needed)
function parseDuration(timeRange) {
    // simplified parsing: not strictly necessary unless we validate slot capacity on drag
    return 30; // default safe fallback
}

export default DraggableAppointment;
