import React from 'react';
import { useDrop } from 'react-dnd';
import { ITEM_TYPE_APPOINTMENT } from './DraggableAppointment';

const DroppableSlot = ({ time, stylistId, onDrop, children, isOccupied, isPast }) => {
    const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
        accept: ITEM_TYPE_APPOINTMENT,
        drop: (item) => {
            onDrop(item.id, time, stylistId);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }), [time, stylistId, onDrop]);

    // Visual feedback when dragging over
    const isActive = isOver && canDrop;

    const getBackgroundColor = () => {
        if (isPast && !isOver) return '#f3f4f6'; // Gray-100 for past slots
        if (!isActive) return 'transparent';
        if (isOccupied) return 'rgba(239, 68, 68, 0.2)'; // Light red for conflict
        return 'rgba(0, 137, 123, 0.1)'; // Subtle teal for valid drop
    };

    return (
        <div
            ref={dropRef}
            className={`slot-cell ${isOccupied ? 'has-content' : ''} ${isPast ? 'is-past' : ''}`}
            style={{
                backgroundColor: getBackgroundColor(),
                opacity: isPast ? 0.7 : 1
            }}
        >
            {children}
        </div>
    );
};

export default DroppableSlot;
