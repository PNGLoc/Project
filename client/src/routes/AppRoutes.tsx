import { Routes, Route } from 'react-router-dom';

import HomePage from '../pages/HomePage';


const AppRoutes = () => {
    return (
        <Routes>
            {/* --- NHÓM PUBLIC  --- */}
            {/* Chèn tương tự như HomePage */}
            <Route path="/" element={<HomePage />} /> 

            <Route path="/sign-in" />
            <Route path="/sign-up" />

            <Route path="/search" />

            <Route path="/lookbook"  />
            <Route path="/ai-analysis"/>

            <Route path="/category/:type"  />

            {/* <Route path="/profile" /> */}

            <Route path="*" element={<div>404 - Không tìm thấy trang</div>} />
        </Routes>
    );
};

export default AppRoutes;