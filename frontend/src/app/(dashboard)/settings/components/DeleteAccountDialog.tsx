"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";

const DELETE_CONFIRMATION_TEXT = "حذف";

interface DeleteAccountDialogProps {
	/** Called with the entered password (empty string when requirePassword is false). */
	onConfirm: (password: string) => void | Promise<void>;
	/** Ask the user to re-enter their password before allowing deletion. Default true. */
	requirePassword?: boolean;
	isDeleting?: boolean;
	trigger?: React.ReactNode;
}

function DeleteAccountDialog({
	onConfirm,
	requirePassword = true,
	isDeleting = false,
	trigger,
}: DeleteAccountDialogProps) {
	const [open, setOpen] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [password, setPassword] = useState("");
	const isTextConfirmed = confirmText === DELETE_CONFIRMATION_TEXT;
	const isConfirmed = isTextConfirmed && (!requirePassword || password.length > 0);

	const handleOpenChange = useCallback((newOpen: boolean) => {
		setOpen(newOpen);
		if (!newOpen) {
			setConfirmText("");
			setPassword("");
		}
	}, []);

	const handleConfirm = useCallback(async () => {
		if (!isConfirmed) return;
		await onConfirm(password);
	}, [isConfirmed, onConfirm, password]);

	const handleCancel = useCallback(() => {
		setOpen(false);
		setConfirmText("");
		setPassword("");
	}, []);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				{trigger ?? (
					<Button variant="destructive" aria-label="حذف الحساب نهائياً">
						<Trash2 className="ml-2 h-4 w-4" aria-hidden="true" />
						حذف الحساب نهائياً
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>هل أنت متأكد؟</DialogTitle>
					<DialogDescription>
						هذا الإجراء لا يمكن التراجع عنه. سيتم حذف حسابك بشكل دائم وجميع بياناتك المرتبطة به.
					</DialogDescription>
				</DialogHeader>
				<div className="py-2 space-y-4">
					{requirePassword && (
						<div className="grid gap-1.5">
							<Label htmlFor="delete-account-password">كلمة المرور لتأكيد الحذف</Label>
							<Input
								id="delete-account-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isDeleting}
								aria-label="كلمة المرور"
							/>
						</div>
					)}
					<div className="grid gap-1.5">
						<Label htmlFor="delete-account-confirm-text">
							يرجى كتابة <strong>{DELETE_CONFIRMATION_TEXT}</strong> للتأكيد
						</Label>
						<Input
							id="delete-account-confirm-text"
							placeholder={`اكتب '${DELETE_CONFIRMATION_TEXT}' للتأكيد`}
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							disabled={isDeleting}
							aria-label="نص التأكيد"
							aria-invalid={!isTextConfirmed && confirmText.length > 0}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={handleCancel} disabled={isDeleting} aria-label="إلغاء حذف الحساب">
						إلغاء
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={!isConfirmed || isDeleting}
						aria-label="تأكيد حذف الحساب"
					>
						{isDeleting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
						حذف الحساب
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default memo(DeleteAccountDialog);
