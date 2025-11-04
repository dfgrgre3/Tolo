import { MessageSquare, Send, Phone, MapPin, Mail } from "lucide-react";
import { memo } from "react";

export const ContactSection = memo(function ContactSection() {
	return (
		<section className="max-w-6xl mx-auto py-8 md:py-12" aria-labelledby="contact-heading">
			<div className="text-center mb-10 md:mb-14">
				<h2 id="contact-heading" className="text-2xl md:text-3xl font-bold mb-4 text-primary flex items-center justify-center gap-2">
					<span>تواصل معنا</span>
					<span className="text-xl" aria-hidden="true">📬</span>
				</h2>
				<p className="text-muted-foreground max-w-2xl mx-auto">نحن هنا لمساعدتك في رحلتك التعليمية. تواصل معنا لأي استفسار أو اقتراح</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div className="bg-white rounded-2xl p-6 md:p-8 shadow-md border border-gray-100">
					<h3 className="text-xl font-bold mb-6 text-gray-800 flex items-center gap-2">
						<MessageSquare className="h-5 w-5 text-primary" />
						<span>أرسل لنا رسالة</span>
					</h3>
					<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); }}>
						<div>
							<label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
							<input type="text" id="name" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" placeholder="أدخل اسمك" />
						</div>
						<div>
							<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
							<input type="email" id="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" placeholder="أدخل بريدك الإلكتروني" />
						</div>
						<div>
							<label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">الرسالة</label>
							<textarea id="message" rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition" placeholder="اكتب رسالتك هنا"></textarea>
						</div>
						<button type="submit" className="w-full px-4 py-2.5 bg-primary text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2">
							<Send className="h-4 w-4" />
							<span>إرسال الرسالة</span>
						</button>
					</form>
				</div>

				<div className="space-y-6">
					<div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 shadow-md border border-blue-100">
						<h3 className="text-xl font-bold mb-6 text-blue-800 flex items-center gap-2">
							<Mail className="h-5 w-5" />
							<span>معلومات التواصل</span>
						</h3>
						<div className="space-y-4">
							<div className="flex items-start gap-3">
								<div className="mt-1 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
									<Mail className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<h4 className="font-medium text-gray-800">البريد الإلكتروني</h4>
									<a href="mailto:info@thanawy-smart.com" className="text-blue-600 hover:underline transition-colors">info@thanawy-smart.com</a>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="mt-1 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
									<Phone className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<h4 className="font-medium text-gray-800">رقم الهاتف</h4>
									<p className="text-gray-600">+20 123 456 7890</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="mt-1 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
									<MapPin className="h-5 w-5 text-blue-600" />
								</div>
								<div>
									<h4 className="font-medium text-gray-800">العنوان</h4>
									<p className="text-gray-600">القاهرة، مصر</p>
								</div>
							</div>
						</div>
					</div>

					<div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 md:p-8 shadow-md border border-indigo-100">
						<h3 className="text-xl font-bold mb-4 text-indigo-800">ساعات العمل</h3>
						<div className="space-y-3">
							<div className="flex justify-between">
								<span className="text-gray-700">السبت - الخميس</span>
								<span className="font-medium">9:00 ص - 6:00 م</span>
							</div>
							<div className="flex justify-between">
								<span className="text-gray-700">الجمعة</span>
								<span className="font-medium">مغلق</span>
							</div>
						</div>
						<div className="mt-6 pt-4 border-t border-indigo-100">
							<p className="text-sm text-indigo-700">نحن نستجيب لجميع الرسائل خلال 24 ساعة في أيام العمل</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
});
ContactSection.displayName = "ContactSection";

export default ContactSection;
