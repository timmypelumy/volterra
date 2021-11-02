const User = require('../db/schema/user');
require('dotenv').config();

const MAX_OBTAINABLE_AIRDROP = process.env.MAX_OBTAINABLE_AIRDROP;
const AIRDROP_PER_REFERRAL = process.env.AIRDROP_PER_REFERRAL;

const getRefLink = (refId) => `${process.env.REFERRAL_BASE_URL}/${refId}`;

async function admitNewReferral(req, res) {
	const ref = req.params.ref || '';
	let user = null;
	let newUser = null;
	const newUserData = {};
	try {
		const userExists = await User.exists({referralId: ref});
		if (!userExists) {
			res.status(401).end();
		} else {
			const chainExists = await User.exists({
				chainAddress: req.body.chainAddress,
			});

			if (chainExists) {
				const user = await User.findOne({
					chainAddress: req.body.chainAddress,
				})
					.lean()
					.exec();
				const response = {
					link: getRefLink(user.referralId),
				};
				res.status(200).json(response);
				return;
			}

			user = await User.findOne({referralId: ref}).exec();
			newUser = await User.create({
				...newUserData,
				chainAddress: req.body.chainAddress,
				referralId: await User.generateReferralLink(),
			});

			if (!user.hasReachedCap) {
				console.log(MAX_OBTAINABLE_AIRDROP, AIRDROP_PER_REFERRAL);
				user.referees.push(newUser._id);
				user.wallet = user.referees.length * AIRDROP_PER_REFERRAL;

				if (user.wallet >= MAX_OBTAINABLE_AIRDROP) {
					user.hasReachedCap = true;
				}
			} else {
				user.referees.push(newUser._id);
			}

			await user.save();
		}

		const response = {
			link: getRefLink(newUser.referralId),
		};
		res.status(200).json(response);
	} catch (err) {
		console.log(err.message);
		res.status(500).end();
	}
}

async function getNewLink(req, res) {
	const userData = {};

	const newLink = await User.generateReferralLink();

	const chainExists = await User.exists({
		chainAddress: req.body.chainAddress,
	});

	if (chainExists) {
		const user = await User.findOne({chainAddress: req.body.chainAddress})
			.lean()
			.exec();
		const response = {
			link: getRefLink(user.referralId),
		};
		res.status(200).json(response);
		return;
	}

	const user = await User.create({
		...userData,
		chainAddress: req.body.chainAddress,
		referralId: newLink,
	});

	const response = {
		link: getRefLink(user.referralId),
	};

	res.status(201).json(response);
}

module.exports = {
	getNewLink,
	admitNewReferral,
};
