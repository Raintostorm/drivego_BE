/** Shared demo content for seed.mjs */

export const ARTICLE_SLUGS = [
  "huong-dan-600-cau",
  "cau-diem-liet-b2",
  "quy-trinh-dang-ky-sat-hach",
  "meo-thi-sa-hinh",
  "cap-nhat-de-thi-2024",
  "huong-dan-app-drivego",
]

export const DEMO_ARTICLES = [
  {
    slug: "huong-dan-600-cau",
    title: "Cấu trúc đề thi và hướng dẫn học 600 câu hỏi lý thuyết 2024",
    body: "Câu hỏi điểm liệt — sai một câu là trượt ngay. Nắm vững biển báo, quy tắc ưu tiên và dùng tính năng thi thử DriveGo mỗi ngày.",
    category: "ly-thuyet",
    licenseClass: null,
  },
  {
    slug: "cau-diem-liet-b2",
    title: "Danh sách câu điểm liệt hạng B2 cần nhớ",
    body: "Tập trung 60 câu điểm liệt: vượt đèn đỏ, không nhường đường, sai làn đường cao tốc. In checklist và ôn 10 phút/ngày.",
    category: "ly-thuyet",
    licenseClass: "B2",
  },
  {
    slug: "quy-trinh-dang-ky-sat-hach",
    title: "Quy trình đăng ký thi sát hạch trực tuyến",
    body: "Bước 1: Chọn hạng bằng. Bước 2: Chọn ca thi trên DriveGo. Bước 3: Thanh toán phí (nếu có). Bước 4: Nhận thông báo xác nhận qua app.",
    category: "quy-trinh",
    licenseClass: null,
  },
  {
    slug: "meo-thi-sa-hinh",
    title: "Mẹo thi sa hình và mô phỏng 120 tình huống",
    body: "Quan sát góc camera, nhận diện nguy hiểm sớm, bấm phanh khi tốc độ vượt ngưỡng. Luyện 5 đề/ngày trước thi 1 tuần.",
    category: "mo-phong",
    licenseClass: "B2",
  },
  {
    slug: "cap-nhat-de-thi-2024",
    title: "Cập nhật bộ đề thi mới nhất từ Bộ GTVT",
    body: "DriveGo đã đồng bộ 600 câu hỏi và bộ đề thi thử B2. Học viên Premium được thi không giới hạn và xem giải thích chi tiết.",
    category: "tin-tuc",
    licenseClass: "B2",
  },
  {
    slug: "huong-dan-app-drivego",
    title: "Hướng dẫn sử dụng app DriveGo cho người mới",
    body: "Đăng ký tài khoản → Chọn hạng B2 → Học video lý thuyết → Thi thử → Đăng ký lịch sát hạch → Tra cứu kết quả.",
    category: "huong-dan",
    licenseClass: null,
  },
]

export const LOOKUP_CODES = [
  { code: "079095001234", name: "Nguyễn Văn An", license: "B2", status: "Đạt kết quả" },
  { code: "HV-101", name: "Nguyễn Văn An", license: "B2", status: "Đạt kết quả" },
  { code: "079095009999", name: "Trần Thị Bích", license: "B1", status: "Đang chờ kết quả" },
  { code: "HV-205", name: "Lê Hoàng Nam", license: "B2", status: "Không đạt" },
  { code: "079095008888", name: "Phạm Minh Đức", license: "A1", status: "Đạt kết quả" },
]

function q(id, body, answers, correctIndex, isCritical = false) {
  return { id, body, answers, correctIndex, isCritical }
}

export function buildPaper1Questions(ID) {
  return [
    q(ID.question1, "Khi điều khiển xe trên đường biết có xe sau xin vượt, nếu đủ điều kiện an toàn bạn cần?", [
      "Tăng tốc và ra hiệu cho xe sau vượt.",
      "Giảm tốc, đi sát lề phải cho xe sau vượt.",
      "Bấm còi liên tục để cảnh báo.",
    ], 1),
    q(ID.question2, "Biển báo hình tam giác đều, viền đỏ, nền trắng thuộc loại biển báo gì?", [
      "Biển báo cấm", "Biển báo nguy hiểm", "Biển báo hiệu lệnh",
    ], 1),
    q(ID.question3, "Tại nơi đường giao nhau không có báo hiệu đi theo vòng xuyên tiếp, xe nào được ưu tiên?", [
      "Xe bên trái", "Xe bên phải", "Xe lớn hơn",
    ], 1, true),
    q(ID.question4, "Khi lái xe trong khu dân cư ban đêm, đèn chiếu xa được sử dụng như thế nào?", [
      "Luôn bật đèn chiếu xa",
      "Chuyển sang đèn chiếu gần khi có xe đối diện",
      "Tắt hết đèn pha",
    ], 1),
    q(ID.question5, "Người lái xe mô tô hai bánh đội mũ bảo hiểm không cài quai đúng quy cách bị phạt vì?", [
      "Không vi phạm nếu đội mũ",
      "Không thực hiện đúng quy định về mũ bảo hiểm",
      "Chỉ bị nhắc nhở",
    ], 1),
    q(ID.question6, "Đường cao tốc dành cho loại phương tiện nào?", [
      "Mọi loại xe cơ giới",
      "Xe cơ giới theo quy định, không bao gồm xe thô sơ",
      "Chỉ xe con",
    ], 1),
    q(ID.question7, "Khi xe buýt đang dừng đón, trả khách tại điểm có vạch dừng xe buýt, người lái xe khác phải?", [
      "Vượt qua bên trái",
      "Giảm tốc, có thể dừng lại chờ",
      "Bấm còi yêu cầu xe buýt nhường",
    ], 1),
    q(ID.question8, "Biển số màu xanh dương trên xe ô tô cá nhân thuộc loại biển số gì?", [
      "Biển số quân sự", "Biển số cá nhân", "Biển số kinh doanh",
    ], 1),
    q(ID.question9, "Hành vi vượt đèn đỏ có thể bị xử phạt và?", [
      "Chỉ phạt tiền",
      "Phạt tiền và trừ điểm GPLX",
      "Không bị phạt nếu không gây tai nạn",
    ], 1, true),
    q(ID.question10, "Khoảng cách an toàn giữa hai xe phụ thuộc vào?", [
      "Chỉ tốc độ xe phía trước",
      "Tốc độ, mật độ giao thông và điều kiện mặt đường",
      "Luôn cố định 10 mét",
    ], 1),
  ]
}

export function buildPaper2Questions(ID) {
  const base = "66666666-6666-4666-8666-6666666666"
  const ids = Array.from({ length: 10 }, (_, i) => `${base}${String(11 + i).padStart(2, "0")}`)
  const items = [
    ["Khi thấy biển P.102 (Cấm đi ngược chiều), người lái xe phải?", ["Quay đầu nếu không có xe", "Không được đi vào đường có biển này", "Đi chậm"], 1],
    ["Vạch kẻ đường màu vàng liền nét có ý nghĩa?", ["Được phép vượt", "Phân chia làn đi cùng chiều", "Không được vượt qua vạch"], 2],
    ["Người đi bộ sang đường nơi có đèn tín hiệu, đèn xanh dành cho xe đang bật?", ["Đi nhanh qua", "Không được sang đường", "Đi chậm bên cạnh xe"], 1, true],
    ["Trên đường cao tốc, xe hỏng phải dừng ở đâu?", ["Giữa làn đường", "Lề đường bên phải và bật đèn cảnh báo", "Làn dừng khẩn cấp nếu có"], 2],
    ["Nồng độ cồn tối đa cho người lái ô tô?", ["Không được uống rượu bia", "Không vượt quy định theo luật hiện hành", "50mg/100ml máu"], 1],
    ["Biển R.301a (Đi thẳng) có nghĩa?", ["Bắt buộc đi thẳng", "Khuyến cáo đi thẳng", "Cấm rẽ trái"], 0],
    ["Khi xe ưu tiên có tín hiệu ưu tiên đang làm nhiệm vụ?", ["Dừng lại hoặc nhường đường", "Đi song song", "Vượt nhanh"], 0],
    ["Thời gian tối đa thi lý thuyết ô tô thường là?", ["15 phút", "22 phút", "45 phút"], 1],
    ["Sai câu điểm liệt trong bài thi lý thuyết?", ["Vẫn đạt nếu đủ điểm", "Trượt ngay", "Thi lại câu đó"], 1, true],
    ["Đèn vàng nhấp nháy tại giao lộ báo hiệu?", ["Dừng ngay", "Giảm tốc, quan sát và đi theo quy tắc giao nhau", "Tăng tốc"], 1],
  ]
  return items.map(([body, answers, correctIndex, critical], i) =>
    q(ids[i], body, answers, correctIndex, Boolean(critical)),
  )
}

export const DEMO_NOTIFICATIONS = [
  { type: "exam", title: "Thông báo lịch thi", body: "Lịch thi sát hạch B2 đã xác nhận — có mặt lúc 07:30 tại Trung tâm Làng Đại Học.", action: "/schedule", daysAgo: 1, unread: true },
  { type: "study", title: "Nhắc nhở bài học", body: "Hoàn thành Chương 2: Quy tắc giao thông trước ngày mai.", action: "/theory", daysAgo: 2, unread: true },
  { type: "exam", title: "Kết quả thi thử", body: "Bạn đạt 10/10 ở đề số 08 — tiếp tục phong độ nhé!", action: "/history", daysAgo: 3, unread: false },
  { type: "system", title: "Gói Premium sắp hết hạn", body: "Premium của bạn còn 7 ngày. Gia hạn để thi không giới hạn.", action: "/upgrade", daysAgo: 4, unread: true },
  { type: "study", title: "Video mới", body: "Chương 3: Kỹ thuật lái xe an toàn đã có video bài giảng.", action: "/theory", daysAgo: 5, unread: false },
  { type: "exam", title: "Đề thi mới", body: "Đề thi số 07 với 10 câu mới đã được thêm vào thư viện.", action: "/exam", daysAgo: 6, unread: true },
  { type: "schedule", title: "Ca thi còn chỗ", body: "Ca chiều 13:30 ngày mai còn 35 suất trống tại Trung tâm Làng Đại Học.", action: "/schedule", daysAgo: 0, unread: true },
  { type: "system", title: "Cập nhật 600 câu", body: "Bộ câu hỏi lý thuyết đã đồng bộ theo quy định mới nhất.", action: "/docs", daysAgo: 7, unread: false },
]
