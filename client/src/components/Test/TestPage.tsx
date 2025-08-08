import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <h1 className="text-4xl font-bold text-white mb-8">测试页面</h1>
      <p className="text-xl text-gray-300 mb-8">
        如果您能看到这个页面，说明路由工作正常！
      </p>
      <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4">功能状态检查</h2>
        <div className="space-y-2 text-left">
          <p className="text-green-400">✅ React Router 工作正常</p>
          <p className="text-green-400">✅ TypeScript 编译成功</p>
          <p className="text-green-400">✅ 组件渲染正常</p>
          <p className="text-green-400">✅ Tailwind CSS 样式生效</p>
        </div>
      </div>
    </div>
  );
};

export default TestPage;