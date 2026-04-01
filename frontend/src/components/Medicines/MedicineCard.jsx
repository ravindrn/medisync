import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PlusIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const MedicineCard = ({ medicine, onAddToWatchlist }) => {
    const { user } = useAuth();

    const getStatusColor = (status) => {
        switch(status) {
            case 'Available':
                return 'text-green-600 bg-green-100';
            case 'Low Stock':
                return 'text-yellow-600 bg-yellow-100';
            case 'Out of Stock':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Available':
                return <CheckCircleIcon className="h-4 w-4" />;
            case 'Low Stock':
                return <ExclamationTriangleIcon className="h-4 w-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                            {medicine.medicineName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Strength: {medicine.weight}{medicine.unit}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Total Available</p>
                        <p className="text-2xl font-bold text-blue-600">
                            {medicine.totalAvailable} units
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <h4 className="font-medium text-gray-700 mb-3">Available at:</h4>
                    <div className="space-y-3">
                        {medicine.stocks.map((stock, idx) => (
                            <div key={idx} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-gray-800">{stock.hospitalName}</p>
                                        <p className="text-sm text-gray-500">District: {stock.district}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(stock.status)}`}>
                                            {getStatusIcon(stock.status)}
                                            {stock.status}
                                        </span>
                                        <p className="text-sm font-medium text-gray-700 mt-1">
                                            Quantity: {stock.availableQuantity} units
                                        </p>
                                    </div>
                                </div>
                                {user && (
                                    <button
                                        onClick={() => onAddToWatchlist(medicine._id, stock.hospitalName, stock.district)}
                                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        Add to Watchlist - {stock.hospitalName}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {!user && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700 text-center">
                            🔒 Login to add medicines to your watchlist and track availability!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MedicineCard;