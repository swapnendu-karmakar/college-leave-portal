import { getStatusColor } from '../../utils/validators';

const StatusBadge = ({ status, text }) => {
    const color = getStatusColor(status);

    const colorClasses = {
        green: 'bg-green-100 text-green-800 border-green-200',
        orange: 'bg-orange-100 text-orange-800 border-orange-200',
        red: 'bg-red-100 text-red-800 border-red-200',
        gray: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
        <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${colorClasses[color]}`}>
            {text || status}
        </span>
    );
};

export default StatusBadge;
