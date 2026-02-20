import React from 'react';

const ToggleSwitch = ({ 
  isOn, 
  onToggle, 
  icon: Icon, 
  labelText, 
  mobileText,
  size = 'default' 
}) => {
  const sizeClasses = {
    small: {
      container: 'w-8 h-4',
      dot: 'w-3 h-3',
      label: 'text-xs'
    },
    default: {
      container: 'w-11 h-6',
      dot: 'w-5 h-5',
      label: 'text-sm'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      onClick={onToggle}
      className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors"
    >
      {Icon && <Icon className={`h-4 w-4 ${size === 'small' ? 'sm:h-3 sm:w-3' : ''}`} />}
      
      {/* Label */}
      <span className={`${currentSize.label} hidden sm:inline`}>
        {labelText}
      </span>
      <span className={`${currentSize.label} sm:hidden`}>
        {mobileText || labelText}
      </span>
      
      {/* Toggle Switch */}
      <div className={`relative ${currentSize.container} bg-gray-600 rounded-full transition-colors duration-200 ${
        isOn ? 'bg-green-600' : 'bg-gray-600'
      }`}>
        <div
          className={`absolute top-0.5 ${currentSize.dot} bg-white rounded-full transition-transform duration-200 ${
            isOn ? 'translate-x-5' : 'translate-x-0.5'
          } ${size === 'small' ? (isOn ? 'translate-x-4' : 'translate-x-0.5') : ''}`}
        />
      </div>
    </button>
  );
};

export default ToggleSwitch;
