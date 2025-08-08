import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "选择选项...",
  className = "",
  allowClear = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 更新显示值
  useEffect(() => {
    const selectedOption = options.find(opt => opt.value === value);
    setDisplayValue(selectedOption ? selectedOption.label : '');
    setSearchTerm('');
  }, [value, options]);

  // 过滤选项
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 处理点击外部区域
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 bg-gray-800 bg-opacity-90 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {value && allowClear ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] w-full mt-1 bg-gray-800 bg-opacity-95 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-sm">没有找到匹配的选项</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`px-3 py-2 cursor-pointer transition-colors text-sm ${
                  option.value === value
                    ? 'bg-blue-600 bg-opacity-80 text-white'
                    : 'text-gray-200 hover:bg-gray-700 hover:bg-opacity-80'
                }`}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
